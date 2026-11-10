import { initWasm, renderWithMetadata } from "./wasm.js";
import { setupWikiInteractions } from "./interactions.js";

const STORAGE_KEY = "aonwki.home.source.v1";
const DEFAULT_SOURCE = `= AonWIki에 오신 것을 환영합니다 =

AonWIki는 기존 **Namumark 파서와 WASM 렌더러**를 사용하는 위키입니다.

== 문서 편집 ==
오른쪽 아래의 **문서 편집** 버튼을 눌러 Namumark 원문을 수정할 수 있습니다.

== 문법 ==
- 제목: = 제목 =
- 굵게: **굵게**
- 내부 링크: [[문서명]]
- 분류: [[분류:위키]]

문법 처리와 문서 렌더링은 기존 엔진이 담당합니다.
`;

const output = document.getElementById("content");
const editor = document.getElementById("source-editor");
const status = document.getElementById("status");
const editToggle = document.getElementById("edit-toggle");
const editorPanel = document.getElementById("editor-panel");
const classification = document.getElementById("classification");
const toc = document.getElementById("mainlist");
const tocList = document.getElementById("toc-list");
const interactions = setupWikiInteractions(output);
let source = localStorage.getItem(STORAGE_KEY) ?? DEFAULT_SOURCE;
let savedSource = source;

function buildToc() {
  tocList.replaceChildren();
  const headings = [...output.querySelectorAll("h1, h2, h3, h4, h5, h6")];
  if (!headings.length) {
    toc.hidden = true;
    return;
  }
  const list = document.createElement("ol");
  for (const [index, heading] of headings.entries()) {
    if (!heading.id) heading.id = `aonwki-section-${index + 1}`;
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = `#${heading.id}`;
    link.textContent = heading.textContent.trim();
    item.append(link);
    list.append(item);
  }
  tocList.append(list);
  toc.hidden = false;
}

function render() {
  interactions.reset();
  const result = renderWithMetadata(source);
  output.innerHTML = result.html;
  interactions.refresh();
  buildToc();
  if (result.categories.length) {
    classification.textContent = `분류: ${result.categories.join(" · ")}`;
    classification.hidden = false;
  } else {
    classification.hidden = true;
    classification.textContent = "";
  }
}

function openEditor() {
  editor.value = source;
  editorPanel.hidden = false;
  editToggle.textContent = "편집 닫기";
  editor.focus();
}
function closeEditor() {
  editorPanel.hidden = true;
  editToggle.textContent = "문서 편집";
}

document.getElementById("edit-toggle").addEventListener("click", () => {
  if (editorPanel.hidden) openEditor();
  else closeEditor();
});
document.getElementById("cancel-edit").addEventListener("click", () => {
  editor.value = savedSource;
  closeEditor();
});
document.getElementById("save-edit").addEventListener("click", () => {
  source = editor.value;
  savedSource = source;
  localStorage.setItem(STORAGE_KEY, source);
  try {
    render();
    status.textContent = "미리보기에 반영됨 · 이 브라우저에 저장됨";
    closeEditor();
  } catch (error) {
    status.textContent = `렌더링 오류: ${error.message}`;
  }
});
document.getElementById("search-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const query = document.getElementById("search-input").value.trim();
  if (query && typeof window.find === "function") window.find(query);
});

status.textContent = "WASM 로딩 중…";
try {
  await initWasm();
  render();
  editToggle.disabled = false;
  status.textContent = "Namumark WASM 준비 완료";
} catch (error) {
  status.textContent = `WASM 로드 오류: ${error.message}`;
}
