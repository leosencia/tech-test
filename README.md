# Team Impact Simulator

A Next.js web application that analyzes team composition and simulates the impact of adding a new candidate to the team. It compares candidate skills against team aggregates, identifies skill redundancies, and highlights value-add opportunities.

**Live Demo:** https://tech-test-ztnd.vercel.app/

## Features

- **Organization Search**: Search and select organizations to load team member profiles.
- **Candidate Search**: Search for individual candidates by name or username.
- **Team Analysis**: Aggregates skills, languages, and proficiency levels across team members.
- **Skill Frequency Chart**: Visualizes the top 15 team skills with expandable "See more" / "See all" controls.
- **Radar Chart**: Compares candidate skills against team aggregate across multiple dimensions.
- **Delta Analysis**: Identifies skill redundancies and value-add opportunities when adding a candidate.
- **Impact Simulation**: Calculates and displays alerts for high/medium/low redundancy and unique skill contributions.

## Tech Stack

- **Frontend**: React, Next.js (App Router), TypeScript
- **Styling**: Tailwind CSS
- **Data Visualization**: Custom Radar Chart component
- **API Integration**: Torre.ai (genome, search, opportunities)
- **Server Route**: Next.js API route for CORS-free genome proxying

## Project Structure

```
app/
├── api/
│   └── genome/[username]/route.ts     # Server-side proxy for genome requests
├── components/
│   ├── RadarChart.tsx                 # Radar chart for skill comparison
│   ├── SkillFrequencyChart.tsx         # Team skill frequency visualization
│   ├── DeltaAnalysis.tsx               # Redundancy and value-add alerts
│   └── LoadingSpinner.tsx              # Loading indicator
├── lib/
│   ├── api.ts                          # API client (searchEntities, getGenome, etc.)
│   └── teamAnalysis.ts                 # Team aggregate & delta calculation logic
├── types/
│   └── api.ts                          # TypeScript interfaces for API responses
└── page.tsx                            # Main app page (organization + candidate search, simulation)
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Search Organization**: Enter an organization name to load team members.
   - The app searches for people associated with the organization and fetches their genome profiles.

2. **Load Team**: Once an organization is selected, team member genomes are fetched and aggregated (skills, languages, experience).

3. **Search Candidate**: Enter a candidate username or name to fetch their genome profile.

4. **Simulate Impact**: Click "Simulate Impact" to:
   - Calculate skill deltas (candidate vs. team aggregate).
   - Generate redundancy alerts (skills candidate shares with team).
   - Identify value-add skills (unique or rare skills candidate brings).

5. **View Results**:
   - **Radar Chart**: Visual comparison of candidate vs. team across skill dimensions.
   - **Skill Frequency**: Team's top 15 skills (expandable to see all).
   - **Delta Analysis**: Alerts and insights on skill overlap and unique contributions.

## API Integration

The app integrates with **Torre.ai** public APIs:

- **POST /entities/_searchStream**: Search for people and organizations.
- **GET /genome/bios/$username**: Fetch a person's genome (skills, languages, experience, etc.).
- **GET /suite/opportunities/$job-id**: Fetch job posting details (not currently used in app).

A server-side proxy route (`/api/genome/[username]`) is used to avoid CORS issues in the browser.

## Key Components

### SkillFrequencyChart
Displays team skills sorted by frequency.
- Props: `skills`, `maxDisplay` (default 15), `title`, `totalMembers`
- Features: Expandable "See more / See all" controls, progress bars, dark mode.

### RadarChart
Compares candidate skills vs. team aggregate using a radar visualization.
- Props: `data` (array of RadarDataPoint), `teamLabel`, `candidateLabel`, `showCandidate`
- Maps proficiency levels (beginner → expert) to numeric values (1–5).

### DeltaAnalysis
Displays redundancy and value-add alerts with severity indicators.
- Props: `redundancyAlerts`, `valueAddAlert`
- Color-coded by severity (high → red, medium → yellow, low → green).

## Team Analysis Logic

### buildTeamAggregate
Aggregates skills and languages across all team genomes:
- Counts occurrences (frequency).
- Calculates average proficiency per skill.
- Stores language and experience data.

### calculateDelta
Compares candidate genome against team aggregate:
- Identifies skills candidate has that overlap with team (redundancy candidates).
- Identifies unique/rare skills candidate brings (value-add candidates).

### generateAlerts
Generates human-readable alerts based on delta analysis:
- **Redundancy Alerts**: High/medium/low overlap for candidate skills.
- **Value-Add Alert**: Highlights unique skills or rare proficiency levels.

## Known Limitations

- **Organization Search**: This tool relies on Torre.ai platform's teams data. Results are only as accurate as the profiles provided by the organizations.