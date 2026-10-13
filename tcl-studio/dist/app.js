const $ = selector => document.querySelector(selector);
const storageKey = 'tcl-studio-progress-v1';
const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
if (!Array.isArray(saved) || saved.some(id => !Number.isInteger(id) || id < 1 || id > 40)) throw new Error('Invalid learning progress');
const completed = new Set(saved);
let selectedPhase = 0;
let expanded = false;
let activeLesson = null;
let questionIndex = 0;
let previousFocus = null;
let toastTimer;
function notify(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 2500); }
function renderCourses() {
    const query = $('#search').value.trim().toLowerCase();
    const matches = curriculum.filter(lesson => (!selectedPhase || lesson.phase === selectedPhase) && `${lesson.title} ${lesson.tags} ${lesson.id}`.toLowerCase().includes(query));
    const visible = expanded || query || selectedPhase ? matches : matches.slice(0,6);
    $('#result-count').textContent = `${matches.length} 个课程章节`;
    $('#empty').hidden = matches.length > 0;
    $('#more').hidden = !!query || !!selectedPhase || matches.length <= 6;
    $('#more').innerHTML = expanded ? '收起课程 <span>↑</span>' : '展开全部课程 <span>↓</span>';
    $('#course-grid').replaceChildren(...visible.map(lesson => {
        const card = document.createElement('button');
        card.className = `course-card${completed.has(lesson.id) ? ' completed' : ''}`;
        card.setAttribute('aria-label', `第 ${lesson.id} 周：${lesson.title}${completed.has(lesson.id) ? '，已完成' : ''}`);
        card.innerHTML = `<div class="card-art"><span class="art-small">${lesson.id <= 20 ? 'tclsh' : 'calibredrv'}</span><strong>${lesson.symbol}</strong><span class="art-small">${lesson.tags.split(' · ')[0]}</span><span class="week-badge">WEEK ${String(lesson.id).padStart(2,'0')}</span></div><div class="card-body"><span class="card-category">${phases[lesson.phase]} / M${lesson.phase*10}</span><h3>${lesson.title}</h3><p>${lesson.goal}</p><div class="card-footer"><span>${lesson.id <= 20 ? 'Tcl' : 'Calibre'} · 30–45 分钟 / 次</span><b>${completed.has(lesson.id) ? '已完成 ✓' : '↗'}</b></div></div>`;
        card.addEventListener('click', () => openLesson(lesson.id));
        return card;
    }));
}
function updateProgress() {
    $('#progress-number').innerHTML = `${completed.size}<span> / 40</span>`;
    $('#progress-fill').style.width = `${completed.size / 40 * 100}%`;
    const next = curriculum.find(lesson => !completed.has(lesson.id));
    $('#progress-caption').textContent = completed.size ? `已完成 ${Math.round(completed.size / 40 * 100)}% · 学习记录已保存` : '每完成一周，就离自己的作品更近一步。';
    $('#resume-title').textContent = completed.size === 40 ? '40 周课程已经完成，继续创造自己的作品。' : completed.size ? `继续探索：${next.title}` : '你的第一行代码，从这里开始。';
    $('#resume-desc').textContent = next ? `第 ${String(next.id).padStart(2,'0')} 周 · ${next.tags}` : '全部里程碑已完成 · 可以重新阅读任意课程';
}
function startLearning() { openLesson(curriculum.find(lesson => !completed.has(lesson.id))?.id || 1); }
function openLesson(id) {
    activeLesson = curriculum.find(lesson => lesson.id === id);
    if (!activeLesson) throw new Error('Lesson does not exist');
    previousFocus = document.activeElement;
    const lesson = activeLesson;
    $('#lesson-label').textContent = `WEEK ${String(id).padStart(2,'0')} / TCL STUDIO`;
    $('#lesson-phase').textContent = `${phases[lesson.phase]} · M${lesson.phase * 10}`;
    $('#lesson-title').textContent = lesson.title;
    $('#lesson-intro').textContent = lesson.tags;
    $('#lesson-goal').textContent = lesson.goal;
    $('#lesson-notes').replaceChildren();
    const notes = document.createElement('p'); notes.textContent = lesson.notes; $('#lesson-notes').append(notes);
    $('#lesson-code').textContent = lesson.code;
    $('#lesson-exercise').textContent = lesson.exercise;
    $('#example-output').hidden = !lesson.output;
    $('#lesson-output').textContent = lesson.output || '';
    $('#runtime-note').textContent = lesson.reference ? '以上为命令索引。请在 Calibre DESIGNrev 中查看对应命令的 Usage，按当前版本补充参数。' : lesson.id <= 20 ? '运行方法：下载示例，在文件所在目录执行 tclsh week_' + String(id).padStart(2,'0') + '.tcl。下方为已通过 tclsh 验证的示例输出。' : '运行环境：Calibre DESIGNrev / calibredrv。涉及输入文件的示例需要前面课程生成的 GDS；请在自己的练习目录运行。';
    $('#download-code').hidden = lesson.reference;
    const ready = [1,2,3,4,5,6,15,21,22,23,24,25,26,27,28].includes(id);
    $('#original-lesson').href = `https://github.com/SJTU-YONGFU-RESEARCH-GRP/tcl-language/blob/main/${ready ? `lessons/${id}/lesson_zh.md` : 'PLAN.md'}`;
    $('#check-understand').checked = completed.has(id);
    $('#check-practice').checked = completed.has(id);
    $('#completion-message').textContent = completed.has(id) ? '本周已经记录完成，可以继续复习。' : '';
    updateCompleteButton();
    if (!$('#lesson-dialog').open) $('#lesson-dialog').showModal();
    $('#lesson-dialog').scrollTop = 0;
}
function updateCompleteButton() { $('#complete-lesson').disabled = !$('#check-understand').checked || !$('#check-practice').checked; }
function renderQuestion() {
    const question = questions[questionIndex];
    $('#quiz-count').textContent = `练习 ${String(questionIndex+1).padStart(2,'0')} / 08`;
    $('#quiz-file').textContent = `practice_${String(questionIndex+1).padStart(2,'0')}.tcl`;
    $('#quiz-title').textContent = question.title;
    $('#quiz-code').textContent = question.code;
    $('#quiz-feedback').textContent = '选择一个答案，检查你的理解。';
    $('#quiz-options').replaceChildren(...question.options.map((option,index) => {
        const button = document.createElement('button'); button.textContent = `${String.fromCharCode(65+index)}. ${option}`;
        button.addEventListener('click', () => {
            const correct = index === question.answer;
            $('#quiz-options').querySelectorAll('button').forEach(item => item.classList.remove('correct','incorrect'));
            button.classList.add(correct ? 'correct' : 'incorrect');
            $('#quiz-feedback').textContent = `${correct ? '回答正确！' : '继续尝试。'} ${question.explanation}`;
        });
        return button;
    }));
}
document.querySelectorAll('[data-phase]').forEach(button => button.addEventListener('click', () => {
    selectedPhase = Number(button.dataset.phase);
    document.querySelectorAll('[data-phase]').forEach(item => item.classList.toggle('selected', item === button));
    renderCourses();
}));
document.querySelectorAll('[data-milestone]').forEach(button => button.addEventListener('click', () => {
    selectedPhase = Number(button.dataset.milestone);
    $('#search').value = '';
    document.querySelectorAll('[data-phase]').forEach(item => item.classList.toggle('selected', Number(item.dataset.phase) === selectedPhase));
    renderCourses(); $('#courses').scrollIntoView({behavior:'smooth'});
}));
$('#search').addEventListener('input',renderCourses);
$('#more').addEventListener('click', () => { expanded = !expanded; renderCourses(); if (!expanded) $('#courses').scrollIntoView({behavior:'smooth'}); });
['#start','#resume','#closing-start'].forEach(id => $(id).addEventListener('click',startLearning));
$('#close-lesson').addEventListener('click', () => $('#lesson-dialog').close());
$('#lesson-dialog').addEventListener('close', () => previousFocus?.focus());
['#check-understand','#check-practice'].forEach(id => $(id).addEventListener('change',updateCompleteButton));
$('#complete-lesson').addEventListener('click', () => {
    completed.add(activeLesson.id); localStorage.setItem(storageKey, JSON.stringify([...completed]));
    updateProgress(); renderCourses(); $('#completion-message').textContent = '本周学习已记录完成。继续创造你的下一个作品！'; notify('学习进度已保存');
});
$('#copy-code').addEventListener('click', async () => { await navigator.clipboard.writeText(activeLesson.code); notify('代码已复制'); });
$('#download-code').addEventListener('click', () => {
    const link = document.createElement('a'); const url = URL.createObjectURL(new Blob([activeLesson.code+'\n'],{type:'text/plain;charset=utf-8'}));
    link.href = url; link.download = `week_${String(activeLesson.id).padStart(2,'0')}.tcl`; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
});
$('#next-question').addEventListener('click', () => { questionIndex = (questionIndex+1)%questions.length; renderQuestion(); });
document.addEventListener('keydown', event => { if(event.key === '/' && !$('#lesson-dialog').open && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) { event.preventDefault(); $('#search').focus(); $('#courses').scrollIntoView({behavior:'smooth'}); } });
const observer = new IntersectionObserver(entries => entries.forEach(entry => { if(entry.isIntersecting) document.querySelectorAll('.rail-link').forEach(link => link.classList.toggle('active',link.hash === '#'+entry.target.id)); }), {rootMargin:'-10% 0px -65% 0px'});
['home','courses','lab','roadmap'].forEach(id => observer.observe(document.getElementById(id)));
renderCourses(); updateProgress(); renderQuestion();
