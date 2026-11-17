const storyCount = document.querySelector("#story-count");
const stories = document.querySelectorAll(".story-card");

storyCount.textContent = `${stories.length} ${stories.length === 1 ? "story" : "stories"}`;
