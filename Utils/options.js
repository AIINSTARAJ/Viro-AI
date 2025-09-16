document.addEventListener("DOMContentLoaded", () => {
    chrome.storage.sync.get(["viroxKey"], (result) => {
      if (result.viroxKey) {
        document.getElementById("api-key").value = result.viroxKey;
      }
    });
  
    document.getElementById("save-button").addEventListener("click", () => {
      const apiKey = document.getElementById("api-key").value.trim();
  
      if (apiKey) {
        chrome.storage.sync.set({ viroxKey: apiKey }, () => {
          const successMessage = document.getElementById("success-message");
          successMessage.style.display = "block";
  
          setTimeout(() => {
            window.close();
            chrome.tabs.getCurrent((tab) => {
              if (tab) {
                chrome.tabs.remove(tab.id);
              }
            });
          }, 4000);
        });
      }
    });
  });