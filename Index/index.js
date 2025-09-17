

document.getElementById("summarize").addEventListener("click", async () => {
    const resultDiv = document.getElementById("result");
    resultDiv.innerHTML = '<div class="loading"><div class="loader"></div></div>';
  
    const summaryType = document.getElementById("summary-type").value;
  
    // Get API key from storage
    chrome.storage.sync.get(["viroxKey"], async (result) => {
      if (!result.viroxKey) {
        resultDiv.innerHTML =
          "API key not found. Please set your API key in the extension options.";
        return;
      }
  
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        chrome.tabs.sendMessage(
          tab.id,
          { type: "GET_ARTICLE_TEXT" },
          async (res) => {
            if (!res || !res.text) {
              resultDiv.innerText =
                "Could not extract article text from this page.";
              return;
            }
  
            try {
              const summary = await getGeminiSummary(
                res.text,
                summaryType,
                result.viroxKey
              );
              resultDiv.innerHTML = summary;
            } catch (error) {
              resultDiv.innerText = `Error: ${
                error.message || "Failed to generate summary."
              }`;
            }
          }
        );
      });
    });
  });
  
  document.getElementById("copy-btn").addEventListener("click", () => {
    const summaryText = document.getElementById("result").innerText;
  
    if (summaryText && summaryText.trim() !== "") {
      navigator.clipboard
        .writeText(summaryText)
        .then(() => {
          const copyBtn = document.getElementById("copy-btn");
          const originalText = copyBtn.innerText;
  
          copyBtn.innerText = "Copied!";
          setTimeout(() => {
            copyBtn.innerText = originalText;
          }, 2000);
        })
        .catch((err) => {
          console.error("Failed to copy text: ", err);
        });
    }
  });
  
  async function getGeminiSummary(text, summaryType, apiKey) {
    const maxLength = 200000;
    const truncatedText =
      text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  
    let prompt;
    switch (summaryType) {
        case "brief":
          prompt = `
            Return ONLY a single HTML fragment (no text before/after) that provides a compact, substantive summary of the article below. The HTML must include a short <style> block at the top. All CSS selectors in the style block must end with the suffix "-viro". The fragment must be responsive and fit inside a narrow panel (max width 800px). Use semantic HTML (<article>, <h2>, <p>, <ul>) and accessible markup.

              Layout requirements:
              - Container .article-viro must be fluid: width:100%; max-width:800px; box-sizing:border-box; padding:12px.
              - Use readable font sizes and line-height so content looks good in a small panel.
              - Keep CSS minimal and use CSS variables for accent colors.

              Content requirements:
              - A bold headline (<h2>) that captures the core insight.
              - **Three** short paragraphs (each 2–4 sentences): (1) main insight, (2) strongest evidence/reason it matters, (3) one concrete actionable takeaway.
              - Use <strong> for emphasis and <span class="emphasis-viro"> to color-key one important word or phrase per paragraph.
              - Language: clear, practical, and slightly more developed than a single-sentence summary (aim ~120–220 words total).
              - Do NOT include any scripts or external resources. Output only the HTML fragment.

              <style>
                :root { --accent-viro: #66b3ff; --muted-viro: #9fbce8; --highlight-viro: #ffd166; }
                .article-viro { width:100%; max-width:800px; box-sizing:border-box; padding:12px; font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; color: #e6eef8; }
                .title-viro { margin:0 0 8px 0; color:var(--accent-viro); font-size:1.1rem; }
                .meta-viro { font-size:0.82rem; color:var(--muted-viro); margin-bottom:10px; }
                .section-viro { margin:8px 0; line-height:1.45; color: #eef7ff; }
                .emphasis-viro { color:var(--highlight-viro); font-weight:700; }
              </style>

              <article class="article-viro">
                <h2 class="title-viro">[Headline — capture the core claim]</h2>
                <div class="meta-viro">Summary • concise, action-focused</div>

                <p class="section-viro"><strong>Main insight:</strong> <span class="emphasis-viro">[one-sentence core claim]</span></p>

                <p class="section-viro"><strong>Why it matters:</strong> [2–3 sentences explaining the strongest supporting evidence or consequence—be concrete and specific.]</p>

                <p class="section-viro"><strong>Actionable takeaway:</strong> [2–3 sentences telling the reader what to do or watch for—practical and clear.]</p>
              </article>

              <!-- article content for reference (hidden) -->
              <blockquote style="display:none">${truncatedText}</blockquote>`.trim();
            break;
            
        case "detailed":
            prompt = `
                Return ONLY a single HTML fragment (no extra prose) that gives a thorough, well-structured, and visually readable summary of the article below. Include a compact <style> block where every CSS selector ends with "-viro". Design must be responsive and fit within a narrow extension panel (width:100%, max-width:800px). Use semantic elements (<article>, <header>, <section>, <h2>, <p>, <ul>, <li>) and keep CSS minimal.

                Layout & style notes:
                - Container should be fluid: .article-viro { width:100%; max-width:800px; box-sizing:border-box; padding:12px; }
                - Use readable font sizes and line-height for small panels and vertical scrolling.
                - Keep colors accessible and use CSS variables.

                Content requirements:
                - Prominent title/header capturing the thesis.
                - "Key Points" list: 5–8 concise bullets (each 1 sentence).
                - "Deep Dive": 4 paragraphs (each 3–5 sentences) that explore major arguments, evidence, and nuance.
                - "Quotes & Data" micro-section: extract 1–2 notable facts or short quotes (use <strong>).
                - "Implications & Next Steps": 3 clear, prioritized actions or implications.
                - Use <strong> and <span class="emphasis-viro"> for emphasis. Make output substantial (aim ~400–1000 words). Output only the HTML fragment.

                <style>
                  :root { --accent-viro: #66b3ff; --muted-viro: #9fbce8; --highlight-viro: #ffd166; --bg-viro: transparent; }
                  .article-viro { width:100%; max-width:800px; box-sizing:border-box; padding:12px; font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; color:#eaf6ff; }
                  .headline-viro { margin:0 0 8px 0; color:var(--accent-viro); font-size:1.2rem; }
                  .lead-viro { font-size:0.92rem; color:var(--muted-viro); margin-bottom:10px; }
                  .points-viro { margin:8px 0 12px 18px; color:#eaf6ff; }
                  .deep-viro { margin:8px 0; line-height:1.6; color:#ecf5ff; }
                  .quote-viro { display:block; margin:10px 0; padding-left:10px; border-left:3px solid var(--highlight-viro); color:#fffdf0; background: rgba(255,209,102,0.03); }
                  .implications-viro { margin-top:12px; padding:10px; border-radius:6px; background: rgba(102,179,255,0.03); color:#e9f6ff; }
                  .emphasis-viro { color:var(--highlight-viro); font-weight:700; }
                </style>

                <article class="article-viro">
                  <header>
                    <h2 class="headline-viro">[Full headline capturing thesis]</h2>
                    <div class="lead-viro">Comprehensive summary — structured for clarity and action.</div>
                  </header>

                  <section aria-label="key-points">
                    <h3 class="headline-viro">Key Points</h3>
                    <ul class="points-viro">
                      <li><strong>[Point 1 — short]</strong></li>
                      <li>[Point 2 — short]</li>
                      <li>[Point 3 — short]</li>
                      <li>[Point 4 — short]</li>
                      <li>[Point 5 — short]</li>
                    </ul>
                  </section>

                  <section class="deep-viro" aria-label="deep-dive">
                    <h3 class="headline-viro">Deep Dive</h3>
                    <p class="deep-viro"><strong>[Subpoint A —]</strong> [Detailed paragraph exploring argument, evidence, context.]</p>
                    <p class="deep-viro"><strong>[Subpoint B —]</strong> [Detailed paragraph with data/quotes/analysis.]</p>
                    <p class="deep-viro"><strong>[Subpoint C —]</strong> [Detailed paragraph on implications and nuance.]</p>
                    <p class="deep-viro"><strong>[Subpoint D —]</strong> [If relevant, next-step analysis or open questions.]</p>
                  </section>

                  <section class="quote-viro" aria-label="quotes">
                    <strong>Notable quote/data:</strong> [Insert succinct quote or key data point if present in the article.]
                  </section>

                  <section class="implications-viro" aria-label="implications">
                    <h3 class="headline-viro">Implications & Recommendations</h3>
                    <p>[3 prioritized, concrete actions or risks/opportunities — practical and specific.]</p>
                  </section>
                </article>

                <blockquote style="display:none">${truncatedText}</blockquote>
              `.trim();
            break;
            
        case "bullets":
            prompt = `
                Return ONLY an HTML fragment (no extra text) that summarizes the article as a styled list. Include a short <style> block where every selector ends with "-viro". The output must be responsive (container max-width 800px) and scannable in a narrow panel.

                Content requirements:
                - Title/headline at top.
                - Exactly 6 bullets (<ul> with 6 <li>), each starting with a short <strong>phrase</strong> (3–6 words) followed by one clear sentence (1–2 sentences allowed) of detail.
                - In each bullet highlight one key word using <span class="emphasis-viro">...</span>.
                - Keep bullets short but informative—aim total ~150–300 words.

                <style>
                  :root { --accent-viro:#66b3ff; --accent2-viro:#ffd166; --text-viro:#eef7ff; }
                  .article-viro { width:100%; max-width:800px; box-sizing:border-box; padding:12px; font-family: system-ui, -apple-system, "Segoe UI", Roboto, Arial; color:var(--text-viro); }
                  .headline-viro { color:var(--accent-viro); font-size:1.05rem; margin-bottom:8px; }
                  .bullets-viro { margin:0 0 0 18px; }
                  .bullets-viro li { margin-bottom:8px; line-height:1.4; }
                  .emphasis-viro { color:var(--accent2-viro); font-weight:800; }
                </style>

                <article class="article-viro">
                  <h2 class="headline-viro">[Concise headline]</h2>
                  <ul class="bullets-viro">
                    <li><strong>[Lead phrase]</strong> — [One clear sentence; highlight the key word: <span class="emphasis-viro">[keyword]</span>].</li>
                    <li><strong>[Lead phrase]</strong> — [One clear sentence; highlight the key word: <span class="emphasis-viro">[keyword]</span>].</li>
                    <li><strong>[Lead phrase]</strong> — [One clear sentence; highlight the key word: <span class="emphasis-viro">[keyword]</span>].</li>
                    <li><strong>[Lead phrase]</strong> — [One clear sentence; highlight the key word: <span class="emphasis-viro">[keyword]</span>].</li>
                    <li><strong>[Lead phrase]</strong> — [One clear sentence; highlight the key word: <span class="emphasis-viro">[keyword]</span>].</li>
                    <li><strong>[Lead phrase]</strong> — [One clear sentence; highlight the key word: <span class="emphasis-viro">[keyword]</span>].</li>
                  </ul>
                </article>

                <blockquote style="display:none">${truncatedText}</blockquote>
              `.trim();
            break;
            
        default:
            prompt = `
                Return ONLY a single HTML fragment (no commentary) that provides a balanced, readable summary. Include a small <style> block where all selectors end with "-viro". Make output responsive to a narrow panel (width:100%, max-width:800px). Use semantic HTML and keep CSS concise.

                Required sections:
                - Headline that captures the thesis.
                - Key points (4–6 bullets).
                - Short analysis (3 paragraphs, 2–4 sentences each).
                - Actionable next steps box with 2–4 concrete recommendations.
                - Use <strong> and <span class="emphasis-viro"> for emphasis. Prefer clarity and practical language. Produce a substantive result (aim ~250–600 words). Output only the HTML fragment.

                <style>
                  :root { --accent-viro:#66b3ff; --muted-viro:#9fbce8; --highlight-viro:#ffd166; }
                  .article-viro { width:100%; max-width:800px; box-sizing:border-box; padding:12px; font-family: system-ui, -apple-system, "Segoe UI", Roboto, Arial; color:#eef7ff; }
                  .headline-viro { color:var(--accent-viro); font-size:1.1rem; margin-bottom:8px; }
                  .section-viro { margin:8px 0; line-height:1.45; color:#eef7ff; }
                  .steps-viro { background: rgba(102,179,255,0.03); padding:10px; border-radius:6px; color:#e9f6ff; }
                  .emphasis-viro { color:var(--highlight-viro); font-weight:700; }
                </style>

                <article class="article-viro">
                  <h2 class="headline-viro">[Headline capturing thesis]</h2>

                  <section class="section-viro">
                    <h3 class="headline-viro">Key Points</h3>
                    <ul>
                      <li><strong>Point 1:</strong> [Short text]</li>
                      <li><strong>Point 2:</strong> [Short text]</li>
                      <li><strong>Point 3:</strong> [Short text]</li>
                      <li><strong>Point 4:</strong> [Short text]</li>
                    </ul>
                  </section>

                  <section class="section-viro">
                    <h3 class="headline-viro">Analysis</h3>
                    <p>[Paragraph 1 — deep analysis]</p>
                    <p>[Paragraph 2 — context & nuance]</p>
                    <p>[Paragraph 3 — implications]</p>
                  </section>

                  <section class="steps-viro">
                    <h3 class="headline-viro">Actionable next steps</h3>
                    <p>[3 clear actions or recommendations]</p>
                  </section>
                </article>

                <blockquote style="display:none">${truncatedText}</blockquote>
          `.trim();
      }
      
  
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              temperature: 0.2,
            },
          }),
        }
      );
  
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || "API request failed");
      }
  
    const data = await res.json();
      return (
        data?.candidates?.[0]?.content?.parts?.[0]?.text?.replace(/```html|```/gi, '').replace(/\n+/g, '\n').trim() || 
        "No summary available."
      );
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      throw new Error("Failed to generate summary. Please try again later.");
    }
  }