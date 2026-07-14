(async () => {
  const categoryEl = document.getElementById("category");
  const instructionsEl = document.getElementById("instructions");
  const promptTextEl = document.getElementById("promptText");
  const recordBtn = document.getElementById("recordBtn");
  const playBtn = document.getElementById("playBtn");
  const redoBtn = document.getElementById("redoBtn");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const statusEl = document.getElementById("status");
  const progressLabel = document.getElementById("progressLabel");
  const progressFill = document.getElementById("progressFill");

  let prompts = [];
  let idx = 0;
  let mediaRecorder = null;
  let chunks = [];
  let recordedBlob = null;
  let stream = null;

  function renderMarkdownBold(text) {
    return text.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  }

  async function loadPrompts() {
    const res = await fetch("/api/prompts");
    const data = await res.json();
    prompts = data.prompts;
    const firstUnrecorded = prompts.findIndex((p) => !p.recorded);
    idx = firstUnrecorded === -1 ? 0 : firstUnrecorded;
    render();
  }

  function render() {
    const p = prompts[idx];
    categoryEl.textContent = p.category;
    instructionsEl.textContent = p.instructions || "";
    promptTextEl.innerHTML = renderMarkdownBold(p.text || "(no text — follow the instructions above)");
    playBtn.disabled = !p.recorded;
    redoBtn.disabled = !p.recorded;
    statusEl.textContent = p.recorded ? "Already recorded — you can redo it or move on." : "";
    recordedBlob = null;

    const doneCount = prompts.filter((x) => x.recorded).length;
    progressLabel.textContent = `${doneCount} / ${prompts.length} recorded  (${idx + 1} of ${prompts.length} shown)`;
    progressFill.style.width = `${(doneCount / prompts.length) * 100}%`;

    prevBtn.disabled = idx === 0;
    nextBtn.disabled = idx === prompts.length - 1;
  }

  async function startRecording() {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunks = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = async () => {
      recordedBlob = new Blob(chunks, { type: "audio/webm" });
      stream.getTracks().forEach((t) => t.stop());
      statusEl.textContent = "Uploading…";
      await uploadRecording();
      statusEl.textContent = "Saved.";
      prompts[idx].recorded = true;
      playBtn.disabled = false;
      redoBtn.disabled = false;
      render();
    };
    mediaRecorder.start();
    recordBtn.textContent = "■ Stop";
    recordBtn.classList.add("recording");
    statusEl.textContent = "Recording…";
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    recordBtn.textContent = "● Record";
    recordBtn.classList.remove("recording");
  }

  async function uploadRecording() {
    const p = prompts[idx];
    const form = new FormData();
    form.append("file", recordedBlob, `${p.id}.webm`);
    await fetch(`/api/save/${p.id}`, { method: "POST", body: form });
  }

  recordBtn.addEventListener("click", () => {
    if (recordBtn.classList.contains("recording")) stopRecording();
    else startRecording();
  });

  playBtn.addEventListener("click", () => {
    const p = prompts[idx];
    const audio = new Audio(`/api/audio/${p.id}?t=${Date.now()}`);
    audio.play();
  });

  redoBtn.addEventListener("click", () => startRecording());

  prevBtn.addEventListener("click", () => {
    idx = Math.max(0, idx - 1);
    render();
  });
  nextBtn.addEventListener("click", () => {
    idx = Math.min(prompts.length - 1, idx + 1);
    render();
  });

  await loadPrompts();
})();
