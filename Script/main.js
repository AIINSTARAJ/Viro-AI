chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.get(["viroxKey"], (result) => {
        if (!result.viroKey) {
            chrome.tabs.create({ url: "Utils/options.html" });
        }
    });
});
