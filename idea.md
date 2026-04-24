So we got input from a conversation with our leadership that were very interested in a potential homepage experience that is powered by a agentic experience. Our agent is called Luna within Newsela and so we want to have a homepage experience where a general agentic state could help the user do a variety of different tasks.

We have a service that will allow us to accomplish this and we have a couple of key functions already successful in search with Luna as well as lesson plan generator so this is the concept want to build some clickable prototypes this could just be a clickable HTML that helps to show this state so it should show starting on the homepage and then basically going to an experience. 

Design inspirations for this concept have been included here https://www.figma.com/proto/6uFmYkpFnxPSeI8OvHpkkV/Homepage-2026?node-id=150-13965&viewport=-343%2C688%2C0.11&t=HSVBk4gNIouMbxPk-1&scaling=scale-down-width&content-scaling=fixed&starting-point-node-id=150%3A13965&page-id=150%3A12654. We are also interested in having the entry point on the home page potentially redirect the user to a page like app.newsela.com/luna to handle longer form chat. 

Product Requirements Document: Agentic Luna Homepage
   
Overview

Newsela's teacher homepage is a daily-use surface with low engagement for AI-assisted workflows. Teachers currently navigate to discrete tools (search, lesson planner, text leveler) separately, requiring multiple context switches per task.
Goal: Embed Luna — Newsela's AI agent — directly into the homepage as the primary interaction surface, so a teacher can describe what they're teaching and Luna handles the rest: finding the right content, wrapping it with supporting materials, and building it into an assignment — in one conversation.

Problem Statement

Teachers spend significant time on instructional prep: finding grade-appropriate content, aligning to standards, and building assignments. Newsela has the tools to automate much of this, but they are siloed. Teachers must know which tool to use before they start.
Luna changes the entry point from "which tool do I need?" to "what am I trying to teach?"

Users

Primary: K-12 teachers (all subjects, all grade bands) who use Newsela for content and assignments.
Secondary: Department heads / instructional coaches who build shared resources.

MVP Scope

MVP = Use Case: Individual Content Assignment
A teacher asks Luna for a specific article or video. Luna finds the best match from the Newsela catalog, surfaces ranked results, and then offers to wrap the selected piece with supporting materials (lesson plan, graphic organizer) and turn it into an assignment.
Example prompts:
	•	"Find me an article about firefighters for my 2nd grade community helpers unit."
	•	"I need a video about the water cycle for 5th grade science."
	•	"Find a short article on the Civil Rights Movement for 7th grade ELA."

MVP User Journey

The complete end-to-end flow for a teacher using Luna to create an individual content assignment:
Step 1 — Homepage Entry

Teacher lands on the Newsela homepage and sees the Luna input bar prominently in the hero section. They type a natural-language request (or tap a suggestion chip) and submit.
"Find me an article about firefighters for my 2nd grade community helpers unit."
Step 2 — Routing to Luna Chat

The homepage detects single-content intent (keywords: "find", "an article", "a video", "search for") and navigates to the Luna chat page (app.newsela.com/luna) with the prompt pre-loaded as the first user message.
Step 3 — Luna Processes the Request

Luna displays a chain of visible thinking steps as it works:
	1	"Understanding your teaching goal…"
	2	"Searching the Newsela catalog…"
	3	"Filtering for 2nd grade reading level…"
	4	"Ranking results by relevance…"
Step 4 — Content Results Picker

Luna returns a ranked list of 3–5 content items. Each result shows:
	•	Content type badge (Article / Video)
	•	Title
	•	Grade level / maturity for videos
	•	Lexile score
	•	Description 
	•	Excerpt preview (expandable on click) - nice to have, not for MVP
Teacher clicks a row to preview it in the artifact panel (right side). Selection is single-choice (radio). When ready, teacher clicks "Use this resource/content →".
Step 5 — Luna Asks About Supporting Materials

Luna acknowledges the selection and immediately follows up:
"Great — which supporting resources would you like me to create to go with this?"
Teacher sees a support picker with the following options:



Option

Description

Default

📘 Lesson plan
Learning objective, activities, discussion questions
Selected
🗂️ Graphic organizer
Visual note-taking tool for students
Not selected


Teacher toggles desired supports and clicks "Generate".
Step 6 — Luna Generates Materials

Luna shows a second chain of thinking steps corresponding to what was selected:
	•	"Aligning to CCSS ELA standards for 2nd grade…"
	•	"Drafting learning objective and activities…" (if lesson plan)
	•	"Building graphic organizer layout…" (if GO)
	•	"Assembling your materials…"
Step 7 — Artifact Panel Reveals

Luna sends a message confirming completion and the artifact panel populates with generated materials. Teacher can:
	•	Expand/collapse each section independently
	•	Edit content inline
	•	Download individual sections as PDF
	•	Click "＋ Assign to class" to push the package into the existing assignment creation flow
Step 8 — Follow-up / Refinement

Teacher can send follow-up messages to refine the output:
	•	"Swap in a different article"
	•	"Make the lesson 30 minutes instead"
	•	"Add a graphic organizer"
Luna re-runs the relevant steps and updates the artifact panel in place.

Entry Points

Primary: Homepage Luna Bar

Prominent natural-language textarea in the hero section with:
	•	Placeholder copy: "What are you teaching this week?"
	•	3 suggestion chips aligned to UC2 intent (e.g., "Find an article about…", "I need a video on…")
	•	Capability cards for direct navigation to individual tools (Lesson Planner, Text Set Builder, Text Leveler) — maintained for discoverability but secondary to Luna bar for MVP
Secondary: Direct URL

app.newsela.com/luna — teachers can navigate directly for longer sessions or bookmark it. Carries full chat + artifact panel experience.

Key Information Luna Must Collect

Luna should extract these from the initial prompt or ask as follow-up before searching:



Parameter

Source

Action if missing

Topic / keywords
Parsed from prompt
Ask: "What topic are you teaching?"
Grade level
Parsed from prompt
Ask: "What grade are you teaching?"
Content type
Parsed from prompt (article/video)
Default: article; offer toggle after results
Standards
Inferred from grade + content item metadata
Surface standards from selected article; allow override
Learning objective
Inferred from topic + grade context by Luna
Pre-filled in lesson plan; editable by teacher
Supporting materials
Selected in Step 5 support picker
Default: lesson plan on; GO off



Note: The lesson planner service currently requires three inputs: an article, a standard, and a learning objective. Luna must ensure all three are resolved — either parsed, inferred, or explicitly asked — before generating the lesson plan artifact.

Functional Requirements (to be confirmed/validated) 

F1 — Homepage Luna Input

	•	[ ] Luna textarea renders in hero section above the fold
	•	[ ] Submit on Enter (no Shift) or click of send button
	•	[ ] Minimum 3 suggestion chips with pre-canned single-content prompts
	•	[ ] Chips populate the textarea on click and auto-submit
	•	[ ] Capability cards navigate directly to respective tools (secondary, maintained for discoverability)
	•	[ ] Homepage passes prompt as URL param to luna.html
F2 — Single-Content Intent Detection

	•	[ ] Prompt is evaluated for single-content signals before routing: "find", "an article", "a video", "search for", "I need a [article/video]"
	•	[ ] Prompts matching single-content signals route to Luna chat
	•	[ ] Routing toast briefly displays destination during transition (~1s)
	•	[ ] Bare lesson-plan prompts (no explicit bundle language) also route to Luna chat → single-content flow
	•	[ ] Fallback for ambiguous prompts: route to Luna chat
F3 — Luna Chat Shell

	•	[ ] User message renders immediately at top of stream
	•	[ ] Chat title auto-set to truncated prompt text
	•	[ ] Luna messages stream character-by-character
	•	[ ] Thinking steps render sequentially with animated indicator; completed steps marked done
	•	[ ] Artifact panel hidden by default; slides in when materials are ready
	•	[ ] Artifact panel closeable; re-openable via button in chat
	•	[ ] Follow-up input enabled at all times; follow-up triggers re-generation of relevant artifact sections only
F4 — Content Results Picker

	•	[ ] Luna returns 3–5 ranked results from Newsela catalog matching topic, grade, and content type
	•	[ ] Each result row displays: type badge, title, grade chip, Lexile (articles) or duration (video), summary
	•	[ ] Clicking a row selects it (radio) and opens a preview in the artifact panel
	•	[ ] Preview shows: full excerpt, standards alignment, word count (articles), keywords
	•	[ ] "Use this article/video →" button confirms selection and advances to supports step
	•	[ ] If no strong matches found, Luna surfaces closest results with a note and offers to broaden or try a different topic
F5 — Supporting Materials Picker

	•	[ ] After content confirmation, Luna message prompts teacher to choose supports
	•	[ ] Support picker renders with two options: Lesson Plan (on by default), Graphic Organizer (off by default, labeled BETA)
	•	[ ] Each option shows label, description, and toggle state
	•	[ ] "Generate" button initiates artifact generation with selected supports
F6 — Artifact Generation

	•	[ ] Lesson plan generation: requires article + inferred/confirmed standard + inferred/confirmed learning objective; output includes learning objective, warm-up activity, main activity, discussion questions, wrap-up
	•	[ ] Graphic organizer generation (BETA): structured grid tied to the article topic; labeled cells with blank lines for student input
	•	[ ] Both sections generated in parallel where possible; each section appears in artifact panel as it completes
F7 — Artifact Panel

	•	[ ] Artifact panel header shows article title and "Your [title] assignment" subtitle
	•	[ ] Each support section is independently collapsible
	•	[ ] Each section has a copy-to-clipboard action
	•	[ ] "Download PDF" button available per section and as a combined download
	•	[ ] "＋ Assign to class" button triggers existing assignment creation flow, pre-populating content and materials
	•	[ ] Save action persists the artifact to teacher's saved content
F8 — Follow-up Handling

	•	[ ] Teacher can send follow-up messages after artifact generation
	•	[ ] "Swap in a different article" re-runs the content picker with new selection
	•	[ ] "Make the lesson [N] minutes" regenerates lesson plan section only
	•	[ ] "Add a graphic organizer" adds GO section without regenerating lesson plan
	•	[ ] Luna confirms each update: "Done — I updated the materials in the side panel. Anything else?"
