**AI Trip Planner: Multi-LLM Comparison Project**
This project is a web-based AI Trip Planner designed to explore and compare the capabilities of the three major AI providers. The goal was to build a unified interface that interacts with different LLMs while tracking performance metrics.

**🎯 Project Goals**
**Multi-Provider Integration:** Successfully implemented API connections for Google Gemini, OpenAI, and Anthropic.

**Performance Metrics:** Built an understanding of latency (response times) across different models.

**Token Analysis:** Monitoring Input vs. Output token usage to evaluate cost-efficiency and context window management.

**Prompt Engineering:** Developing prompts that maintain consistency across different model architectures.

**🛠️ Local Setup Instructions**
Since sensitive configuration files and heavy dependencies are not tracked in this repository, follow these steps to get the project running on your machine.

**1. Clone the Repository**

git clone https://github.com/poojaghera/playground.git
cd playground/ai-trip-planner

**2. Install Dependencies**
This project requires Node.js. Run the following command to install the necessary libraries (this recreates the node_modules folder):

npm install (you would need instructions specific to your machine/OS) 

**3. Configure Environment Variables (Crucial)**
You must create a local environment file to store your API keys.

In the root of the ai-trip-planner folder, create a new file named .env.

Paste the following template into that file and add your personal API keys:

Code snippet

cat > .env.local << 'EOF' 
NEXT_PUBLIC_OPENAI_API_KEY= "YOUR KEY"
NEXT_PUBLIC_GEMINI_API_KEY="YOUR KEY"
ANTHROPIC_API_KEY="YOUR KEY" EOF

**4. Run the App**
Start the development server:

npm run dev

**📈 Research Observations**
API Comparison Logic
The application is structured to log the following data points for every generation:

**Latency**: Time taken from the initial request to the final response. When we added image gen into it. The latency increased further. 

**Input Tokens:** The cost of the prompt and context sent to the provider.

**Output Tokens:** The length and complexity of the generated itinerary.

**📂 Project Structure**
/src: Contains the core logic for API calls and UI.

.gitignore: Specifically configured to exclude .env, node_modules, and Mac system files (.DS_Store).

package.json: Lists all dependencies required to rebuild the environment.

******Initial prompt used (sort of PXD) ******

Build a simple web app which is the home page for a trip planner app. 
Context:
- Language: TypeScript
- Runtime: Node.js 18+
- Framework: Next.js (App Router)
- Goal: Beginner-friendly, minimal, runnable
- Do not use Python or Express



UI: The app has a simple text box which has a header that says : Tell us more about your travel request?
It has a go button and once the button is pressed based upon user input output is generated. 

Output is generated side by side. Output 1 uses Anthropic APIs, Output 2 uses Open AI APIs, and Output 3 uses Gemini API.

Each of the Output panel showing the structured Trip Brief from each of the providers
Name of destination = which has been extracted from the input provided by the user and a brief detail about the destination such as what this place is famous for
10 most popular spots in that destination 
Whether it is kid friendly of not
Best time of year to visit 
Each panel should show - 
Metrics panel showing:
  - latencyMs
  - inputTokens (exact if provider returns usage, otherwise estimate and label as "estimated")
  - outputTokens (same rule)
  - provider + model used
Also good, better, best button in the end of responses so users can select which is the best response


UI elements : Keep the ui clean but modern looking like in apple products. 


The user should provide info about the destination, how many people they are travelling with, what age group are the people. If this info is not provided - prompt the user to provide that info. DO not assume. 

Project requirements:
- Include README with setup steps, env vars, and 3 suggested test inputs
- Minimal styling, focus on correctness and clarity
- Add basic error handling (missing keys, model errors)


Also - note that this will go into github, so generate the required files. 




