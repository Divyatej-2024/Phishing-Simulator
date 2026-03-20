package main

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"enphisimgateway/analysis"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/time/rate"
)

type App struct {
	Router      *mux.Router
	RateLimiter *rate.Limiter
	DB          *mongo.Database
	Scenarios   []Scenario
	Analyzer    *analysis.Service
	PublicDir   string
}

type Scenario struct {
	ID         string   `json:"id" bson:"id"`
	Type       string   `json:"type" bson:"type"`
	Difficulty string   `json:"difficulty" bson:"difficulty"`
	Content    string   `json:"content" bson:"content"`
	Indicators []string `json:"indicators" bson:"indicators"`
}

type SubmitRequest struct {
	ScenarioID  string   `json:"scenarioId"`
	Content     string   `json:"content"`
	Indicators  []string `json:"indicators"`
	UserVerdict string   `json:"userVerdict"`
	TimedOut    bool     `json:"timedOut"`
}

type SubmitResponse struct {
	Score    int      `json:"score"`
	Verdict  string   `json:"verdict"`
	Reasons  []string `json:"reasons"`
	Risk     string   `json:"risk"`
	Category string   `json:"category"`
}

type UserProfile struct {
	SessionKey      string           `bson:"sessionKey"`
	Answered        int              `bson:"answered"`
	Correct         int              `bson:"correct"`
	TotalTime       int              `bson:"totalTime"`
	MistakesByType  map[string]int   `bson:"mistakesByType"`
	LastUpdated     time.Time        `bson:"lastUpdated"`
	ProgressHistory []ProgressSample `bson:"progressHistory"`
}

type ProgressSample struct {
	Timestamp time.Time `bson:"timestamp"`
	Accuracy  int       `bson:"accuracy"`
}

func main() {
	app := &App{
		RateLimiter: rate.NewLimiter(10, 30),
		Analyzer:    analysis.New(),
		PublicDir:   filepath.Join("..", "public"),
	}
	app.connectMongo()
	app.loadScenarios()
	app.ensureScenariosInDB()
	app.setupRouter()

	port := envOr("PORT", "3000")
	log.Printf("AegisPhish Lab (Go) listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, app.Router))
}

func (a *App) setupRouter() {
	r := mux.NewRouter()
	r.Use(a.securityHeaders)
	r.Use(a.rateLimitMiddleware)
	r.Use(a.sessionGuard)

	r.HandleFunc("/api/health", a.healthHandler).Methods("GET")
	r.HandleFunc("/api/scenarios", a.getScenariosHandler).Methods("GET")
	r.HandleFunc("/api/submit", a.submitHandler).Methods("POST")
	r.HandleFunc("/api/dashboard", a.dashboardHandler).Methods("GET")
	r.HandleFunc("/api/admin/scenarios", a.adminListScenarios).Methods("GET")
	r.HandleFunc("/api/admin/scenarios", a.adminUpsertScenarios).Methods("POST")
	r.HandleFunc("/api/admin/scenarios/{id}", a.adminDeleteScenario).Methods("DELETE")

	r.PathPrefix("/").Handler(http.FileServer(http.Dir(a.PublicDir)))

	a.Router = r
}

func (a *App) securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Referrer-Policy", "no-referrer")
		w.Header().Set("X-XSS-Protection", "0")
		next.ServeHTTP(w, r)
	})
}

func (a *App) rateLimitMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !a.RateLimiter.Allow() {
			http.Error(w, "Too many requests", http.StatusTooManyRequests)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (a *App) sessionGuard(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sessionKey := r.Header.Get("x-session-id")
		if sessionKey == "" {
			sessionKey = hashSessionKey(r.RemoteAddr + "|" + r.UserAgent())
		}
		if len(sessionKey) < 12 {
			http.Error(w, "Invalid session", http.StatusUnauthorized)
			return
		}
		r.Header.Set("x-session-id", sessionKey)
		next.ServeHTTP(w, r)
	})
}

func (a *App) healthHandler(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "name": "AegisPhish Lab API (Go)"})
}

func (a *App) getScenariosHandler(w http.ResponseWriter, r *http.Request) {
	scenarios := a.Scenarios
	if a.DB != nil {
		if profile, err := a.getUserProfile(r.Header.Get("x-session-id")); err == nil && profile != nil {
			scenarios = adaptiveScenarioOrder(scenarios, profile)
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"scenarios": scenarios})
}

func (a *App) submitHandler(w http.ResponseWriter, r *http.Request) {
	var payload SubmitRequest
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON payload")
		return
	}
	if err := validateSubmit(payload); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	result := a.Analyzer.Analyze(analysis.Payload{
		Content:    payload.Content,
		Indicators: payload.Indicators,
	})
	resp := SubmitResponse{
		Score:    result.Score,
		Verdict:  result.Verdict,
		Reasons:  result.Reasons,
		Risk:     result.Risk,
		Category: result.Category,
	}

	if a.DB != nil {
		a.updateUserProfile(r.Header.Get("x-session-id"), payload, result)
	}

	writeJSON(w, http.StatusOK, resp)
}

func (a *App) dashboardHandler(w http.ResponseWriter, r *http.Request) {
	if a.DB == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"accuracy": 0,
			"weakAreas": []string{},
			"progress":  []any{},
		})
		return
	}
	profile, err := a.getUserProfile(r.Header.Get("x-session-id"))
	if err != nil {
		writeError(w, http.StatusNotFound, "Profile not found")
		return
	}
	accuracy := 0
	if profile.Answered > 0 {
		accuracy = int(float64(profile.Correct) / float64(profile.Answered) * 100)
	}
	weakArea := weakestType(profile.MistakesByType)

	writeJSON(w, http.StatusOK, map[string]any{
		"accuracy": accuracy,
		"weakAreas": []string{weakArea},
		"progress":  profile.ProgressHistory,
		"risk":      riskFromAccuracy(accuracy),
	})
}

func (a *App) adminListScenarios(w http.ResponseWriter, r *http.Request) {
	if !isAdminAuthorized(r) {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	if a.DB == nil {
		writeJSON(w, http.StatusOK, map[string]any{"scenarios": a.Scenarios})
		return
	}
	a.loadScenariosFromDB()
	writeJSON(w, http.StatusOK, map[string]any{"scenarios": a.Scenarios})
}

func (a *App) adminUpsertScenarios(w http.ResponseWriter, r *http.Request) {
	if !isAdminAuthorized(r) {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	var payload struct {
		Scenarios []Scenario `json:"scenarios"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON payload")
		return
	}
	if len(payload.Scenarios) == 0 {
		writeError(w, http.StatusBadRequest, "No scenarios provided")
		return
	}
	if a.DB == nil {
		a.Scenarios = append(a.Scenarios, payload.Scenarios...)
		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "count": len(payload.Scenarios)})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 6*time.Second)
	defer cancel()
	coll := a.DB.Collection("scenarios")

	for _, s := range payload.Scenarios {
		if strings.TrimSpace(s.ID) == "" {
			continue
		}
		_, _ = coll.UpdateOne(
			ctx,
			map[string]any{"id": s.ID},
			map[string]any{"$set": s},
			options.Update().SetUpsert(true),
		)
	}
	a.loadScenariosFromDB()
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "count": len(payload.Scenarios)})
}

func (a *App) adminDeleteScenario(w http.ResponseWriter, r *http.Request) {
	if !isAdminAuthorized(r) {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	if a.DB == nil {
		writeError(w, http.StatusBadRequest, "Database not configured")
		return
	}
	id := strings.TrimSpace(mux.Vars(r)["id"])
	if id == "" {
		writeError(w, http.StatusBadRequest, "Missing id")
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 6*time.Second)
	defer cancel()
	coll := a.DB.Collection("scenarios")
	_, _ = coll.DeleteOne(ctx, map[string]any{"id": id})
	a.loadScenariosFromDB()
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (a *App) updateUserProfile(sessionKey string, payload SubmitRequest, result analysis.Result) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	coll := a.DB.Collection("profiles")

	profile, _ := a.getUserProfile(sessionKey)
	if profile == nil {
		profile = &UserProfile{
			SessionKey:     sessionKey,
			MistakesByType: map[string]int{},
		}
	}

	profile.Answered++
	if payload.UserVerdict == result.Verdict {
		profile.Correct++
	} else {
		profile.MistakesByType[result.Category]++
	}
	profile.TotalTime += estimateTime(payload.TimedOut)
	profile.LastUpdated = time.Now()
	accuracy := 0
	if profile.Answered > 0 {
		accuracy = int(float64(profile.Correct) / float64(profile.Answered) * 100)
	}
	profile.ProgressHistory = append(profile.ProgressHistory, ProgressSample{
		Timestamp: time.Now(),
		Accuracy:  accuracy,
	})

	_, _ = coll.UpdateOne(ctx, map[string]any{"sessionKey": sessionKey}, map[string]any{"$set": profile}, options.Update().SetUpsert(true))
}

func (a *App) getUserProfile(sessionKey string) (*UserProfile, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	coll := a.DB.Collection("profiles")

	var profile UserProfile
	err := coll.FindOne(ctx, map[string]any{"sessionKey": sessionKey}).Decode(&profile)
	if err != nil {
		return nil, err
	}
	return &profile, nil
}

func validateSubmit(req SubmitRequest) error {
	req.ScenarioID = strings.TrimSpace(req.ScenarioID)
	if req.ScenarioID == "" || len(req.ScenarioID) > 80 {
		return errors.New("scenarioId is required")
	}
	switch req.UserVerdict {
	case "Safe", "Suspicious", "Phishing":
	default:
		return errors.New("userVerdict must be Safe, Suspicious, or Phishing")
	}
	if len(req.Content) > 4000 {
		return errors.New("content too large")
	}
	if len(req.Indicators) > 20 {
		return errors.New("too many indicators")
	}
	return nil
}

func (a *App) loadScenarios() {
	path := filepath.Join("..", "src", "data", "scenarios.sample.json")
	file, err := os.ReadFile(path)
	if err != nil {
		log.Printf("Could not read scenarios file: %v", err)
		a.Scenarios = []Scenario{}
		return
	}
	var scenarios []Scenario
	if err := json.Unmarshal(file, &scenarios); err != nil {
		log.Printf("Could not parse scenarios file: %v", err)
		a.Scenarios = []Scenario{}
		return
	}
	a.Scenarios = scenarios
}

func (a *App) ensureScenariosInDB() {
	if a.DB == nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 6*time.Second)
	defer cancel()
	coll := a.DB.Collection("scenarios")
	count, err := coll.CountDocuments(ctx, map[string]any{})
	if err != nil {
		return
	}
	if count == 0 && len(a.Scenarios) > 0 {
		docs := make([]interface{}, 0, len(a.Scenarios))
		for _, s := range a.Scenarios {
			docs = append(docs, s)
		}
		_, _ = coll.InsertMany(ctx, docs)
	}
	a.loadScenariosFromDB()
}

func (a *App) loadScenariosFromDB() {
	if a.DB == nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 6*time.Second)
	defer cancel()
	coll := a.DB.Collection("scenarios")
	cur, err := coll.Find(ctx, map[string]any{})
	if err != nil {
		return
	}
	defer cur.Close(ctx)
	var scenarios []Scenario
	for cur.Next(ctx) {
		var s Scenario
		if err := cur.Decode(&s); err == nil {
			scenarios = append(scenarios, s)
		}
	}
	if len(scenarios) > 0 {
		a.Scenarios = scenarios
	}
}

func (a *App) connectMongo() {
	uri := strings.TrimSpace(os.Getenv("MONGODB_URI"))
	if uri == "" {
		log.Println("MONGODB_URI not set. MongoDB connection skipped.")
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()
	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		log.Printf("MongoDB connection error: %v", err)
		return
	}
	dbName := envOr("MONGODB_DB", "enphisims")
	a.DB = client.Database(dbName)
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]any{"error": message})
}

func envOr(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

func hashSessionKey(value string) string {
	if len(value) < 12 {
		value += "-seed"
	}
	h := 0
	for _, ch := range value {
		h = int(ch) + ((h << 5) - h)
	}
	return strings.ToLower(base36(uint64(h)))
}

func base36(num uint64) string {
	const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz"
	if num == 0 {
		return "0"
	}
	result := ""
	for num > 0 {
		result = string(alphabet[num%36]) + result
		num /= 36
	}
	return result
}

func estimateTime(timedOut bool) int {
	if timedOut {
		return 35
	}
	return 20
}

func weakestType(mistakes map[string]int) string {
	max := 0
	label := "email"
	for key, value := range mistakes {
		if value > max {
			max = value
			label = key
		}
	}
	return label
}

func riskFromAccuracy(accuracy int) string {
	switch {
	case accuracy >= 85:
		return "low"
	case accuracy >= 60:
		return "medium"
	default:
		return "high"
	}
}

func isAdminAuthorized(r *http.Request) bool {
	adminKey := strings.TrimSpace(os.Getenv("ADMIN_KEY"))
	if adminKey == "" {
		return false
	}
	return r.Header.Get("x-admin-key") == adminKey
}

func adaptiveScenarioOrder(scenarios []Scenario, profile *UserProfile) []Scenario {
	if len(scenarios) == 0 {
		return scenarios
	}
	accuracy := 0
	if profile.Answered > 0 {
		accuracy = int(float64(profile.Correct) / float64(profile.Answered) * 100)
	}
	risk := riskFromAccuracy(accuracy)
	weak := weakestType(profile.MistakesByType)

	ordered := make([]Scenario, len(scenarios))
	copy(ordered, scenarios)
	sort.SliceStable(ordered, func(i, j int) bool {
		scoreI := scenarioPriorityScore(ordered[i], risk, weak)
		scoreJ := scenarioPriorityScore(ordered[j], risk, weak)
		return scoreI > scoreJ
	})
	return ordered
}

func scenarioPriorityScore(s Scenario, risk string, weak string) int {
	score := 0
	if s.Type == weak {
		score += 30
	}
	switch risk {
	case "high":
		if s.Difficulty == "easy" {
			score += 20
		} else if s.Difficulty == "medium" {
			score += 10
		}
	case "medium":
		if s.Difficulty == "medium" {
			score += 20
		} else if s.Difficulty == "easy" {
			score += 10
		}
	case "low":
		if s.Difficulty == "hard" {
			score += 20
		} else if s.Difficulty == "medium" {
			score += 10
		}
	}
	return score
}
