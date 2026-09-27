"use strict";

/* =========================================================
   TASKFLOW
   Application logic
========================================================= */


/* =========================================================
   1. CONFIGURACIÓN
========================================================= */

const STORAGE_KEY = "taskflow.tasks";
const THEME_KEY = "taskflow.theme";


/* =========================================================
   2. DOM REFERENCES
========================================================= */

const elements = {

    form: document.querySelector("#task-form"),

    input: document.querySelector("#task-input"),

    taskList: document.querySelector("#task-list"),

    taskCount: document.querySelector("#task-count"),

    totalTasks: document.querySelector("#total-tasks"),

    pendingTasks: document.querySelector("#pending-tasks"),

    completedTasks:
        document.querySelector("#completed-tasks"),

    progressBar:
        document.querySelector("#progress-bar"),

    progressValue:
        document.querySelector("#progress-value"),

    progressTrack:
        document.querySelector(".progress-track"),

    emptyState:
        document.querySelector("#empty-state"),

    emptyTitle:
        document.querySelector("#empty-title"),

    emptyDescription:
        document.querySelector("#empty-description"),

    clearCompleted:
        document.querySelector("#clear-completed"),

    themeToggle:
        document.querySelector("#theme-toggle"),

    formMessage:
        document.querySelector("#form-message"),

    filterButtons:
        document.querySelectorAll(".filter-button")

};


/* =========================================================
   3. APPLICATION STATE
========================================================= */

const state = {

    tasks: loadTasks(),

    filter: "all",

    editingTaskId: null

};


/* =========================================================
   4. INITIALIZATION
========================================================= */

init();


function init() {

    migrateLegacyTasks();

    bindEvents();

    loadTheme();

    render();

}


/* =========================================================
   5. EVENTS
========================================================= */

function bindEvents() {

    elements.form.addEventListener(
        "submit",
        handleCreateTask
    );


    elements.clearCompleted.addEventListener(
        "click",
        handleClearCompleted
    );


    elements.themeToggle.addEventListener(
        "click",
        toggleTheme
    );


    elements.filterButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    setFilter(
                        button.dataset.filter
                    );

                }
            );

        }
    );


    elements.taskList.addEventListener(
        "click",
        handleTaskListClick
    );


    elements.taskList.addEventListener(
        "keydown",
        handleTaskListKeydown
    );

}


/* =========================================================
   6. CREATE TASK
========================================================= */

function handleCreateTask(event) {

    event.preventDefault();

    clearFormMessage();


    const text =
        elements.input.value.trim();


    if (!text) {

        showFormMessage(
            "Escribe una tarea antes de agregarla."
        );

        elements.input.focus();

        return;

    }


    if (text.length > 120) {

        showFormMessage(
            "La tarea no puede superar los 120 caracteres."
        );

        return;

    }


    const task = {

        id: generateId(),

        title: text,

        completed: false,

        createdAt: new Date().toISOString()

    };


    state.tasks.unshift(task);


    saveTasks();


    elements.input.value = "";


    state.filter = "all";

    state.editingTaskId = null;


    updateFilterButtons();

    render();


    elements.input.focus();

}


/* =========================================================
   7. TASK LIST EVENTS
========================================================= */

function handleTaskListClick(event) {

    const button =
        event.target.closest("[data-action]");


    if (!button) {

        return;

    }


    const taskItem =
        button.closest("[data-task-id]");


    if (!taskItem) {

        return;

    }


    const taskId =
        taskItem.dataset.taskId;


    const action =
        button.dataset.action;


    switch (action) {

        case "toggle":
            toggleTask(taskId);
            break;


        case "edit":
            startEditing(taskId);
            break;


        case "delete":
            deleteTask(taskId);
            break;


        case "save":
            saveEditedTask(taskId, taskItem);
            break;


        case "cancel":
            cancelEditing();
            break;

    }

}


/* =========================================================
   8. KEYBOARD EVENTS
========================================================= */

function handleTaskListKeydown(event) {

    if (event.key !== "Enter") {

        return;

    }


    const input =
        event.target.closest(".task-edit-input");


    if (!input) {

        return;

    }


    const taskItem =
        input.closest("[data-task-id]");


    if (!taskItem) {

        return;

    }


    saveEditedTask(
        taskItem.dataset.taskId,
        taskItem
    );

}


/* =========================================================
   9. TOGGLE TASK
========================================================= */

function toggleTask(taskId) {

    const task =
        findTask(taskId);


    if (!task) {

        return;

    }


    task.completed =
        !task.completed;


    state.editingTaskId = null;


    saveTasks();

    render();

}


/* =========================================================
   10. EDIT TASK
========================================================= */

function startEditing(taskId) {

    const task =
        findTask(taskId);


    if (!task) {

        return;

    }


    state.editingTaskId =
        taskId;


    render();


    const input =
        document.querySelector(
            `.task-item[data-task-id="${taskId}"] .task-edit-input`
        );


    if (input) {

        input.focus();

        input.select();

    }

}


function saveEditedTask(taskId, taskItem) {

    const input =
        taskItem.querySelector(".task-edit-input");


    if (!input) {

        return;

    }


    const newTitle =
        input.value.trim();


    if (!newTitle) {

        input.focus();

        return;

    }


    const task =
        findTask(taskId);


    if (!task) {

        return;

    }


    task.title =
        newTitle.substring(0, 120);


    state.editingTaskId = null;


    saveTasks();

    render();

}


function cancelEditing() {

    state.editingTaskId = null;

    render();

}


/* =========================================================
   11. DELETE TASK
========================================================= */

function deleteTask(taskId) {

    const task =
        findTask(taskId);


    if (!task) {

        return;

    }


    const confirmed =
        window.confirm(
            `¿Eliminar "${task.title}"?`
        );


    if (!confirmed) {

        return;

    }


    state.tasks =
        state.tasks.filter(
            item => item.id !== taskId
        );


    state.editingTaskId = null;


    saveTasks();

    render();

}


/* =========================================================
   12. CLEAR COMPLETED
========================================================= */

function handleClearCompleted() {

    const completedTasks =
        state.tasks.filter(
            task => task.completed
        );


    if (completedTasks.length === 0) {

        return;

    }


    const confirmed =
        window.confirm(
            `¿Eliminar ${completedTasks.length} tareas completadas?`
        );


    if (!confirmed) {

        return;

    }


    state.tasks =
        state.tasks.filter(
            task => !task.completed
        );


    state.editingTaskId = null;


    saveTasks();

    render();

}


/* =========================================================
   13. FILTER
========================================================= */

function setFilter(filter) {

    const validFilters = [
        "all",
        "pending",
        "completed"
    ];


    if (!validFilters.includes(filter)) {

        return;

    }


    state.filter = filter;

    state.editingTaskId = null;


    updateFilterButtons();

    render();

}


function updateFilterButtons() {

    elements.filterButtons.forEach(
        button => {

            const isActive =
                button.dataset.filter === state.filter;


            button.classList.toggle(
                "is-active",
                isActive
            );


            button.setAttribute(
                "aria-pressed",
                String(isActive)
            );

        }
    );

}


/* =========================================================
   14. RENDER
========================================================= */

function render() {

    renderTasks();

    updateStatistics();

    updateEmptyState();

    updateFilterButtons();

}


/* =========================================================
   15. RENDER TASKS
========================================================= */

function renderTasks() {

    const visibleTasks =
        getVisibleTasks();


    elements.taskList.innerHTML = "";


    const fragment =
        document.createDocumentFragment();


    visibleTasks.forEach(
        task => {

            const taskElement =
                createTaskElement(task);


            fragment.appendChild(
                taskElement
            );

        }
    );


    elements.taskList.appendChild(
        fragment
    );

}


/* =========================================================
   16. CREATE TASK ELEMENT
========================================================= */

function createTaskElement(task) {

    const item =
        document.createElement("li");


    item.className = "task-item";

    item.dataset.taskId =
        task.id;


    if (task.completed) {

        item.classList.add(
            "is-completed"
        );

    }


    if (state.editingTaskId === task.id) {

        return createEditingTask(
            item,
            task
        );

    }


    /* CHECK BUTTON */

    const checkButton =
        document.createElement("button");


    checkButton.type = "button";

    checkButton.className =
        "task-checkbox";


    checkButton.dataset.action =
        "toggle";


    checkButton.setAttribute(
        "aria-label",
        task.completed
            ? "Marcar como pendiente"
            : "Marcar como completada"
    );


    const checkIcon =
        document.createElement("i");


    checkIcon.className =
        "fa-solid fa-check";


    checkIcon.setAttribute(
        "aria-hidden",
        "true"
    );


    checkButton.appendChild(
        checkIcon
    );


    /* CONTENT */

    const content =
        document.createElement("div");


    content.className =
        "task-content";


    const title =
        document.createElement("p");


    title.className =
        "task-title";


    title.textContent =
        task.title;


    const meta =
        document.createElement("small");


    meta.className =
        "task-meta";


    meta.textContent =
        formatDate(task.createdAt);


    content.appendChild(title);

    content.appendChild(meta);


    /* ACTIONS */

    const actions =
        document.createElement("div");


    actions.className =
        "task-actions";


    const editButton =
        createActionButton(
            "edit",
            "Editar tarea",
            "fa-pen"
        );


    const deleteButton =
        createActionButton(
            "delete",
            "Eliminar tarea",
            "fa-trash-can"
        );


    actions.appendChild(
        editButton
    );


    actions.appendChild(
        deleteButton
    );


    item.appendChild(checkButton);

    item.appendChild(content);

    item.appendChild(actions);


    return item;

}


/* =========================================================
   17. EDITING TASK ELEMENT
========================================================= */

function createEditingTask(item, task) {

    const checkButton =
        document.createElement("button");


    checkButton.type = "button";

    checkButton.className =
        "task-checkbox";


    checkButton.dataset.action =
        "toggle";


    checkButton.setAttribute(
        "aria-label",
        "Marcar tarea"
    );


    if (task.completed) {

        checkButton.classList.add(
            "is-completed"
        );

    }


    const icon =
        document.createElement("i");


    icon.className =
        "fa-solid fa-check";


    checkButton.appendChild(icon);


    const content =
        document.createElement("div");


    content.className =
        "task-content";


    const input =
        document.createElement("input");


    input.type = "text";

    input.className =
        "task-edit-input";

    input.value =
        task.title;

    input.maxLength = 120;


    content.appendChild(input);


    const actions =
        document.createElement("div");


    actions.className =
        "task-edit-actions";


    const saveButton =
        createEditAction(
            "save",
            "Guardar",
            "fa-check"
        );


    const cancelButton =
        createEditAction(
            "cancel",
            "Cancelar",
            "fa-xmark"
        );


    actions.appendChild(
        saveButton
    );


    actions.appendChild(
        cancelButton
    );


    item.appendChild(checkButton);

    item.appendChild(content);

    item.appendChild(actions);


    return item;

}


/* =========================================================
   18. BUTTON FACTORIES
========================================================= */

function createActionButton(
    action,
    label,
    iconName
) {

    const button =
        document.createElement("button");


    button.type = "button";

    button.className =
        "task-action";


    if (action === "delete") {

        button.classList.add(
            "task-action--delete"
        );

    }


    button.dataset.action =
        action;


    button.setAttribute(
        "aria-label",
        label
    );


    button.title =
        label;


    const icon =
        document.createElement("i");


    icon.className =
        `fa-solid ${iconName}`;


    icon.setAttribute(
        "aria-hidden",
        "true"
    );


    button.appendChild(icon);


    return button;

}


function createEditAction(
    action,
    label,
    iconName
) {

    const button =
        document.createElement("button");


    button.type = "button";

    button.className =
        "task-edit-action";


    button.classList.add(
        action === "save"
            ? "task-edit-action--save"
            : "task-edit-action--cancel"
    );


    button.dataset.action =
        action;


    button.setAttribute(
        "aria-label",
        label
    );


    button.title =
        label;


    const icon =
        document.createElement("i");


    icon.className =
        `fa-solid ${iconName}`;


    icon.setAttribute(
        "aria-hidden",
        "true"
    );


    button.appendChild(icon);


    return button;

}


/* =========================================================
   19. VISIBLE TASKS
========================================================= */

function getVisibleTasks() {

    switch (state.filter) {

        case "pending":

            return state.tasks.filter(
                task => !task.completed
            );


        case "completed":

            return state.tasks.filter(
                task => task.completed
            );


        default:

            return state.tasks;

    }

}


/* =========================================================
   20. STATISTICS
========================================================= */

function updateStatistics() {

    const total =
        state.tasks.length;


    const completed =
        state.tasks.filter(
            task => task.completed
        ).length;


    const pending =
        total - completed;


    const percentage =
        total === 0
            ? 0
            : Math.round(
                (completed / total) * 100
            );


    elements.taskCount.textContent =
        `${total} ${total === 1 ? "tarea" : "tareas"}`;


    elements.totalTasks.textContent =
        total;


    elements.pendingTasks.textContent =
        pending;


    elements.completedTasks.textContent =
        completed;


    elements.progressBar.style.width =
        `${percentage}%`;


    elements.progressValue.textContent =
        `${percentage}%`;


    elements.progressTrack.setAttribute(
        "aria-valuenow",
        percentage
    );


    elements.clearCompleted.disabled =
        completed === 0;

}


/* =========================================================
   21. EMPTY STATE
========================================================= */

function updateEmptyState() {

    const visibleTasks =
        getVisibleTasks();


    const hasTasks =
        visibleTasks.length > 0;


    elements.emptyState.hidden =
        hasTasks;


    if (hasTasks) {

        return;

    }


    if (state.tasks.length === 0) {

        elements.emptyTitle.textContent =
            "No tienes tareas todavía";


        elements.emptyDescription.textContent =
            "Añade tu primera tarea para comenzar.";

        return;

    }


    if (state.filter === "pending") {

        elements.emptyTitle.textContent =
            "No hay tareas pendientes";


        elements.emptyDescription.textContent =
            "¡Excelente! Todas tus tareas están completadas.";

        return;

    }


    if (state.filter === "completed") {

        elements.emptyTitle.textContent =
            "No hay tareas completadas";


        elements.emptyDescription.textContent =
            "Las tareas que completes aparecerán aquí.";

        return;

    }

}


/* =========================================================
   22. STORAGE
========================================================= */

function saveTasks() {

    try {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(state.tasks)
        );

    } catch (error) {

        console.error(
            "No se pudieron guardar las tareas:",
            error
        );

    }

}


function loadTasks() {

    try {

        const stored =
            localStorage.getItem(
                STORAGE_KEY
            );


        if (!stored) {

            return [];

        }


        const parsed =
            JSON.parse(stored);


        if (!Array.isArray(parsed)) {

            return [];

        }


        return parsed
            .filter(
                task =>
                    task &&
                    typeof task.title === "string"
            )
            .map(task => ({

                id:
                    String(
                        task.id || generateId()
                    ),

                title:
                    task.title.trim(),

                completed:
                    Boolean(task.completed),

                createdAt:
                    task.createdAt ||
                    new Date().toISOString()

            }));

    } catch (error) {

        console.error(
            "Error al cargar las tareas:",
            error
        );


        return [];

    }

}


/* =========================================================
   23. LEGACY DATA MIGRATION
========================================================= */

function migrateLegacyTasks() {

    const oldStorage =
        localStorage.getItem("todos");


    if (!oldStorage) {

        return;

    }


    if (state.tasks.length > 0) {

        return;

    }


    try {

        const oldTasks =
            JSON.parse(oldStorage);


        if (!Array.isArray(oldTasks)) {

            return;

        }


        state.tasks =
            oldTasks
                .filter(
                    task =>
                        task &&
                        typeof task.text === "string"
                )
                .map(task => ({

                    id: generateId(),

                    title:
                        task.text.trim(),

                    completed:
                        Boolean(task.completed),

                    createdAt:
                        new Date().toISOString()

                }));


        saveTasks();


        console.info(
            "Tareas antiguas migradas correctamente."
        );

    } catch (error) {

        console.error(
            "No se pudieron migrar las tareas antiguas:",
            error
        );

    }

}


/* =========================================================
   24. FIND TASK
========================================================= */

function findTask(taskId) {

    return state.tasks.find(
        task => task.id === taskId
    );

}


/* =========================================================
   25. ID GENERATOR
========================================================= */

function generateId() {

    if (
        window.crypto &&
        typeof window.crypto.randomUUID === "function"
    ) {

        return window.crypto.randomUUID();

    }


    return (
        Date.now().toString(36) +
        Math.random()
            .toString(36)
            .substring(2)
    );

}


/* =========================================================
   26. DATE FORMAT
========================================================= */

function formatDate(date) {

    const parsedDate =
        new Date(date);


    if (Number.isNaN(parsedDate.getTime())) {

        return "Fecha desconocida";

    }


    return new Intl.DateTimeFormat(
        "es-EC",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    ).format(parsedDate);

}


/* =========================================================
   27. FORM MESSAGE
========================================================= */

function showFormMessage(message) {

    elements.formMessage.textContent =
        message;

}


function clearFormMessage() {

    elements.formMessage.textContent =
        "";

}


/* =========================================================
   28. THEME
========================================================= */

function loadTheme() {

    const savedTheme =
        localStorage.getItem(
            THEME_KEY
        );


    if (savedTheme === "dark") {

        document.body.classList.add(
            "dark-theme"
        );

    }


    updateThemeButton();

}


function toggleTheme() {

    const isDark =
        document.body.classList.toggle(
            "dark-theme"
        );


    localStorage.setItem(
        THEME_KEY,
        isDark ? "dark" : "light"
    );


    updateThemeButton();

}


function updateThemeButton() {

    const icon =
        elements.themeToggle.querySelector("i");


    const isDark =
        document.body.classList.contains(
            "dark-theme"
        );


    icon.className =
        isDark
            ? "fa-solid fa-sun"
            : "fa-solid fa-moon";


    elements.themeToggle.setAttribute(
        "aria-label",
        isDark
            ? "Activar modo claro"
            : "Activar modo oscuro"
    );

}