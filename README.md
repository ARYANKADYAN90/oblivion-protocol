# 🛡️ Oblivion Protocol
**Autonomous RTBF (Right to be Forgotten) Compliance Engine**

![Oblivion Protocol](https://img.shields.io/badge/Status-Hackathon_Complete-00ff41?style=for-the-badge)
![Built With Next.js](https://img.shields.io/badge/Next.js-Black?style=for-the-badge&logo=next.js)
![Powered by Gemini](https://img.shields.io/badge/Gemini_1.5-Blue?style=for-the-badge&logo=google)
![MongoDB MCP](https://img.shields.io/badge/MongoDB_MCP-Green?style=for-the-badge&logo=mongodb)

> British Airways: €20 million. Amazon: €746 million. Meta: €1.2 billion. 
> Massive GDPR fines aren't born from malicious intent—they are born from incomplete data deletion. Oblivion Protocol solves this.

Oblivion Protocol is a zero-trust, multi-agent AI orchestration pipeline designed to systematically hunt down Personally Identifiable Information (PII) across an entire database infrastructure and legally enforce the Right to be Forgotten.

## 🧠 3-Agent Architecture

1. **Schema Crawler Agent**: Connects to the root cluster via the official MongoDB Model Context Protocol (MCP). It ignores hardcoded rules and actively crawls every schema to discover hidden vectors of PII.
2. **Compliance Decision Agent**: Utilizing Vertex AI **Gemini 1.5**, this agent semantically classifies each discovered field and applies strict GDPR Art. 17 logic to decide between a `HARD DELETE` or a `K-ANON REDACT`.
3. **Execution Agent**: Executes the irreversible wipe and generates a Tamper-Evident Cryptographic Audit Chain (`SHA-256`), outputting a court-admissible PDF execution receipt.

## 🚀 Tech Stack
*   **Intelligence:** Vertex AI Gemini 1.5 Pro
*   **Orchestration:** Google Agent Development Kit (ADK) concepts
*   **Data Integration:** `@modelcontextprotocol/server-mongodb`
*   **Frontend Framework:** Next.js App Router, Tailwind CSS
*   **Visualizations:** D3.js / `react-force-graph-2d`
*   **Audit Generation:** `jsPDF` for client-side cryptographic ledger generation

## 🛠️ Local Development

```bash
# Clone the repository
git clone https://github.com/ARYANKADYAN90/oblivion-protocol.git

# Install dependencies
npm install

# Run the development server
npm run dev
```
Open `http://localhost:3000` to view the compliance dashboard.

## 📜 Legal / License
This project was built for the Google Cloud ADK Hackathon. It is a proof-of-concept for AI-driven legal compliance. Not intended for production use without extensive auditing.
