# ZenSpace Organizer

AI-powered room organization assistant. Upload a photo of any messy space and get:
- **Detailed analysis** of clutter and organization issues
- **Step-by-step plan** to declutter and organize
- **AI visualization** of your room after organization
- **Product recommendations** with Amazon links
- **Chat interface** for follow-up questions

## Live Demo

**Production:** https://zenspace-two.vercel.app

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS (CDN)
- **AI:** Google Gemini API (`gemini-2.0-flash`)
- **Hosting:** Vercel

## Development

### Prerequisites
- Node.js 18+
- Google Gemini API key

### Setup

```bash
# Clone the repository
git clone https://github.com/speedwarnsf/ZenSpace.git
cd ZenSpace

# Install dependencies
npm install

# Create environment file
echo "GEMINI_API_KEY=your-api-key-here" > .env.local

# Start development server
npm run dev
```

Open http://localhost:3000

### Build

```bash
npm run build
npm run preview
```

## Deployment (Vercel)

1. Push to GitHub
2. Import project to Vercel
3. Add environment variable:
   - `GEMINI_API_KEY` = your Google Gemini API key
4. Deploy

The app auto-deploys on every push to `main`.

## Features

### Image Analysis
Upload a photo of a messy room. The AI will:
- Identify clutter sources
- Suggest quick wins (< 15 min tasks)
- Recommend storage solutions
- Provide a step-by-step organization plan
- Give aesthetic tips for a "Zen" look

### Room Visualization
Generate an AI-rendered preview of your room after following the organization plan.

### Chat Assistant
Ask follow-up questions about:
- Where to put specific items
- Storage container recommendations
- Color schemes
- Organization strategies

### Product Recommendations
Get specific product suggestions with Amazon affiliate links.

## Project Structure

```
zenspace/
├── App.tsx              # Main application component
├── index.tsx            # React entry point
├── index.html           # HTML template
├── types.ts             # TypeScript interfaces
├── vite.config.ts       # Vite configuration
├── components/
│   ├── UploadZone.tsx   # Drag-drop image upload
│   ├── AnalysisDisplay.tsx  # Analysis results UI
│   └── ChatInterface.tsx    # Chat component
└── services/
    └── geminiService.ts # Gemini API integration
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google Gemini API key | Yes |

## License

MIT
