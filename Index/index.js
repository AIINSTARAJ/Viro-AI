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
            Return ONLY a valid HTML fragment (no preamble, no commentary) that presents a powerful, high-value summary of the article below. The HTML must include a small <style> block at the top. ALL CSS selectors in that style block must end with the suffix "-viro" (example: .title-viro, .emphasis-viro). Use semantic HTML (<article>, <h2>, <p>, <ul>, <li>) and make the summary visually striking:
            - Include a bold headline (<h2>) that captures the article's core insight.
            - Provide 3 short sections (each a paragraph) covering: main claim, strongest supporting evidence, and 1 recommended action/insight for the reader.
            - Use <strong> for bold emphasis and <span class="emphasis-viro"> for colored emphasis.
            - Make the color accents tasteful (use CSS variables) and ensure the style block has selectors suffixed with "-viro".
            - Keep language rich and actionable — not just 2-3 sentences; produce a compact but meaningful, well-structured summary.
            
            Format exactly as HTML. Do not output any plain text before or after the HTML.
            
            <style>
                :root { --accent: #66b3ff; --muted: #a0aec0; --highlight: #ffd166; }
                .title-viro { font-family: serif; color: var(--accent); margin: 0 0 8px 0; }
                .meta-viro { font-size: 0.85rem; color: var(--muted); margin-bottom: 12px; }
                .section-viro { margin: 8px 0; line-height: 1.45; color: #eef2f7; }
                .emphasis-viro { color: var(--highlight); font-weight: 700; }
                .list-viro { margin: 12px 0 0 18px; color: #e6eef8; }
            </style>
            
            <article class="article-viro">
                <h2 class="title-viro">[Headline — succinct, high-impact]</h2>
                <div class="meta-viro">Summary • concise, action-focused</div>
            
                <p class="section-viro"><strong>Main insight:</strong> <span class="emphasis-viro">[one-sentence core claim]</span></p>
            
                <p class="section-viro"><strong>Why it matters:</strong> [One paragraph explaining the strongest supporting evidence or reason — concrete and specific.]</p>
            
                <p class="section-viro"><strong>Actionable takeaway:</strong> [One paragraph telling the reader what to do or watch for — practical and clear.]</p>
            </article>
            
            <!-- Article text to summarize below -->
            <blockquote style="display:none">${truncatedText}</blockquote>
            `.trim();
            break;
            
        case "detailed":
            prompt = `
                Return ONLY a valid HTML document fragment (no explanations) that delivers a thorough, well-structured, and visually styled summary of the article below. Include a <style> block where every CSS selector ends with the suffix "-viro" (for example .headline-viro, .lead-viro). Use semantic elements (<article>, <header>, <section>, <h2>, <p>, <ul>, <li>) and create distinct sections:
                
                - A prominent title/header that captures the article's thesis.
                - A concise "Key Points" list (5–8 bullet points) using <ul>.
                - A "Deep Dive" section with 3–5 paragraphs going into the most important arguments, evidence, and nuances.
                - A "Quotes & Data" mini-section that highlights any notable facts or quoted material (present as <strong>).
                - An "Implications" section with clear, practical recommendations or predicted consequences.
                - Use <strong> for bold emphasis and <span class="emphasis-viro"> for color emphasis. Choose readable color variables in the style.
                
                The HTML must be self-contained (include style) and visually appealing; do not include any JS. Output only the HTML.
            
            <style>
                :root { --accent-viro: #66b3ff; --muted-viro: #9fbce8; --highlight-viro: #ffd166; --bg-viro: transparent; }
                .headline-viro { font-family: Georgia, "Times New Roman", serif; color: var(--accent-viro); font-size: 1.4rem; margin: 0 0 6px 0; }
                .lead-viro { color: var(--muted-viro); margin-bottom: 12px; font-style: italic; }
                .points-viro { margin: 10px 0 14px 18px; color: #eaf6ff; }
                .deep-viro { margin: 8px 0; color: #ecf5ff; line-height: 1.6; }
                .quote-viro { display:block; margin: 10px 0; padding-left: 10px; border-left: 3px solid var(--highlight-viro); color:#fffdf0; background: rgba(255,209,102,0.03); }
                .implications-viro { margin-top: 12px; padding: 10px; background: rgba(102,179,255,0.03); border-radius:6px; color:#e9f6ff; }
                .emphasis-viro { color: var(--highlight-viro); font-weight: 700; }
            </style>
            
            <article class="article-viro">
                <header>
                <h2 class="headline-viro">[Full headline capturing thesis]</h2>
                <div class="lead-viro">Comprehensive summary — detailed, structured, and actionable.</div>
                </header>
            
                <section aria-label="key-points">
                <h3 class="headline-viro">Key Points</h3>
                <ul class="points-viro">
                    <li><strong>[Point 1 — concise]</strong></li>
                    <li>[Point 2 — concise]</li>
                    <li>[Point 3 — concise]</li>
                    <li>[Point 4 — concise]</li>
                    <li>[Point 5 — concise]</li>
                </ul>
                </section>
            
                <section class="deep-viro" aria-label="deep-dive">
                <h3 class="headline-viro">Deep Dive</h3>
                <p class="deep-viro"><strong>[Subpoint A —]</strong> [Detailed paragraph exploring argument, evidence, context.]</p>
                <p class="deep-viro"><strong>[Subpoint B —]</strong> [Detailed paragraph with data/quotes/analysis.]</p>
                <p class="deep-viro"><strong>[Subpoint C —]</strong> [Detailed paragraph on implications and nuance.]</p>
                </section>
            
                <section class="quote-viro" aria-label="quotes">
                <strong>Notable quote/data:</strong> [Insert succinct quote or key data point if present in the article.]
                </section>
            
                <section class="implications-viro" aria-label="implications">
                <h3 class="headline-viro">Implications & Recommendations</h3>
                <p>[Specific actions, risks, opportunities — clearly prioritized and practical.]</p>
                </section>
            </article>
            
            <blockquote style="display:none">${truncatedText}</blockquote>
            `.trim();
            break;
            
        case "bullets":
            prompt = `
                Return ONLY a valid HTML fragment (no prose outside the HTML) that summarizes the article below as a short, powerful, and styled list. Include a <style> block whose selectors end with "-viro". Produce 6 concise bullet points inside a semantic <ul>. Each bullet should be a single <li> that begins with a short <strong>phrase</strong> (3–6 words) followed by one sentence of clarifying detail. Use <span class="emphasis-viro"> to color-key the single most important word in each bullet. The HTML must look polished and include the style block.
            
            <style>
                :root { --accent-viro: #66b3ff; --accent2-viro: #ffd166; --text-viro: #eef7ff; }
                .bullets-viro { margin: 0 0 0 18px; color: var(--text-viro); }
                .bullets-viro li { margin-bottom: 8px; line-height: 1.45; }
                .headline-viro { color: var(--accent-viro); font-family: serif; margin-bottom: 8px; }
                .emphasis-viro { color: var(--accent2-viro); font-weight: 800; }
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
                Return ONLY a valid HTML fragment (no extra commentary). Summarize the article below thoroughly and present it using semantic HTML and a style block where ALL selectors end with "-viro". Include: headline, key points (4–6), a multi-paragraph analysis (3–6 paragraphs), and a concise "Actionable next steps" box. Use <strong> and <span class="emphasis-viro"> for emphasis. Then embed the article content invisibly (for reference) as a hidden block. Output only HTML.
                <style>
                :root { --accent-viro: #66b3ff; --muted-viro: #9fbce8; --highlight-viro: #ffd166; }
                .headline-viro { color: var(--accent-viro); font-family: Georgia, serif; }
                .section-viro { margin: 8px 0; color:#eef7ff; }
                .emphasis-viro { color: var(--highlight-viro); font-weight:700; }
                .steps-viro { background: rgba(102,179,255,0.03); padding:10px; border-radius:6px; }
                </style>
                
                <article class="article-viro">
                    <h2 class="headline-viro">[Headline capturing thesis]</h2>
                    <section class="section-viro">
                    <h3 class="headline-viro">Key Points</h3>
                    <ul>
                        <li><strong>Point 1:</strong> [Short text]</li>
                        <li><strong>Point 2:</strong> [Short text]</li>
                        <li><strong>Point 3:</strong> [Short text]</li>
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
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "No summary available."
      );
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      throw new Error("Failed to generate summary. Please try again later.");
    }
  }