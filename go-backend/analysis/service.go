package analysis

import "strings"

type Result struct {
	Score    int      `json:"score"`
	Verdict  string   `json:"verdict"`
	Reasons  []string `json:"reasons"`
	Risk     string   `json:"risk"`
	Category string   `json:"category"`
}

type Payload struct {
	Content    string
	Indicators []string
}

type Service struct{}

func New() *Service {
	return &Service{}
}

func (s *Service) Analyze(payload Payload) Result {
	score := 0
	reasons := []string{}

	content := strings.ToLower(payload.Content)
	for _, indicator := range payload.Indicators {
		trimmed := strings.TrimSpace(indicator)
		if trimmed != "" {
			score += 8
			reasons = append(reasons, "Indicator: "+trimmed)
		}
	}
	if strings.Contains(content, "urgent") || strings.Contains(content, "immediately") {
		score += 15
		reasons = append(reasons, "Urgency language detected")
	}
	if strings.Contains(content, "password") || strings.Contains(content, "otp") {
		score += 25
		reasons = append(reasons, "Credential request detected")
	}
	if strings.Contains(content, "wire") || strings.Contains(content, "payment") || strings.Contains(content, "invoice") {
		score += 20
		reasons = append(reasons, "Payment request detected")
	}
	if strings.Contains(content, "click") && strings.Contains(content, "link") {
		score += 10
		reasons = append(reasons, "Link-click pressure detected")
	}

	if score > 100 {
		score = 100
	}

	verdict := "Safe"
	if score >= 70 {
		verdict = "Phishing"
	} else if score >= 40 {
		verdict = "Suspicious"
	}

	risk := "low"
	if score >= 70 {
		risk = "high"
	} else if score >= 40 {
		risk = "medium"
	}

	if len(reasons) == 0 {
		reasons = append(reasons, "No strong phishing signals detected by rules")
	}

	return Result{
		Score:    score,
		Verdict:  verdict,
		Reasons:  reasons,
		Risk:     risk,
		Category: s.categorize(content),
	}
}

func (s *Service) categorize(content string) string {
	switch {
	case strings.Contains(content, "sms") || strings.Contains(content, "text"):
		return "smishing"
	case strings.Contains(content, "call") || strings.Contains(content, "phone"):
		return "vishing"
	case strings.Contains(content, "invoice") || strings.Contains(content, "wire"):
		return "whaling"
	default:
		return "email"
	}
}
