# AI Engine: Sentiment & Insights

EngageAI leverages advanced LLMs (like Claude AI) to extract business insights and automate interactions.

---

## 1. Features

### Sentiment Classification
Feedback is parsed by the AI backend to assign sentiment rankings (`positive`, `neutral`, `negative`) and map reviews to specific categories (e.g. `service`, `waiting time`, `product`). This enables dashboard managers to spot trends quickly.

### Queue Wait Time Predictions
Estimates wait times dynamically using queue lengths and historical serving velocities.

### AI Copilot & Automation Engine
Automations are evaluated based on incoming events:
- **Triggers**:
  - `Queue Joined`
  - `Queue Exit`
  - `Registration Completed`
  - `Negative Feedback`
- **Actions**:
  - Automatically dispatches alerts or recovery templates to users.
  - Suggests responses for operator intervention.
