// Smart To-Do Application JavaScript
class TodoApp {
    constructor() {
        this.tasks = [];
        this.currentPage = 'dashboard';
        this.apiUrl = 'http://localhost:3000/api';
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadTasks();
        this.updateStats();
        this.updateCategoryCounts();
    }

    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-item a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.currentTarget.getAttribute('data-page');
                this.showPage(page);
            });
        });

        // Task form submission
        const taskForm = document.getElementById('task-form');
        if (taskForm) {
            taskForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addTask();
            });
        }

        // Edit task form submission
        const editTaskForm = document.getElementById('edit-task-form');
        if (editTaskForm) {
            editTaskForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateTask();
            });
        }

        // Filter events
        const priorityFilter = document.getElementById('priority-filter');
        const statusFilter = document.getElementById('status-filter');
        
        if (priorityFilter) {
            priorityFilter.addEventListener('change', () => this.filterTasks());
        }
        
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.filterTasks());
        }

        // Category cards
        document.querySelectorAll('.category-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const category = e.currentTarget.getAttribute('data-category');
                this.showPage('my-tasks');
                this.filterTasksByCategory(category);
            });
        });
    }

    showPage(pageId) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        document.querySelector(`[data-page="${pageId}"]`).parentElement.classList.add('active');

        // Update page content
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        document.getElementById(pageId).classList.add('active');

        this.currentPage = pageId;

        // Load page-specific data
        if (pageId === 'my-tasks') {
            this.renderAllTasks();
        } else if (pageId === 'dashboard') {
            this.renderRecentTasks();
            this.updateStats();
        }
    }

    async loadTasks() {
        try {
            const response = await fetch(`${this.apiUrl}/tasks`);
            if (response.ok) {
                this.tasks = await response.json();
            } else {
                // Fallback to localStorage if API is not available
                this.tasks = JSON.parse(localStorage.getItem('smart-todo-tasks') || '[]');
            }
        } catch (error) {
            console.log('API not available, using localStorage');
            this.tasks = JSON.parse(localStorage.getItem('smart-todo-tasks') || '[]');
        }
        
        this.renderRecentTasks();
        this.renderAllTasks();
        this.updateStats();
        this.updateCategoryCounts();
    }

    async saveTask(task) {
        try {
            const response = await fetch(`${this.apiUrl}/tasks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(task),
            });
            
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.log('API not available, saving to localStorage');
        }
        
        // Fallback to localStorage
        task.id = Date.now().toString();
        task.createdAt = new Date().toISOString();
        this.tasks.push(task);
        localStorage.setItem('smart-todo-tasks', JSON.stringify(this.tasks));
        return task;
    }

    async updateTaskInDB(taskId, updates) {
        try {
            const response = await fetch(`${this.apiUrl}/tasks/${taskId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updates),
            });
            
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.log('API not available, updating localStorage');
        }
        
        // Fallback to localStorage
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            this.tasks[taskIndex] = { ...this.tasks[taskIndex], ...updates };
            localStorage.setItem('smart-todo-tasks', JSON.stringify(this.tasks));
            return this.tasks[taskIndex];
        }
    }

    async deleteTaskFromDB(taskId) {
        try {
            const response = await fetch(`${this.apiUrl}/tasks/${taskId}`, {
                method: 'DELETE',
            });
            
            if (response.ok) {
                return true;
            }
        } catch (error) {
            console.log('API not available, deleting from localStorage');
        }
        
        // Fallback to localStorage
        this.tasks = this.tasks.filter(t => t.id !== taskId);
        localStorage.setItem('smart-todo-tasks', JSON.stringify(this.tasks));
        return true;
    }

    async addTask() {
        const form = document.getElementById('task-form');
        const formData = new FormData(form);
        
        const task = {
            title: formData.get('title'),
            description: formData.get('description'),
            priority: formData.get('priority'),
            category: formData.get('category'),
            deadline: formData.get('deadline'),
            status: 'pending',
            completed: false
        };

        if (!task.title.trim()) {
            alert('Please enter a task title');
            return;
        }

        const savedTask = await this.saveTask(task);
        
        if (savedTask) {
            form.reset();
            this.showPage('dashboard');
            await this.loadTasks();
            this.showNotification('Task added successfully!', 'success');
        }
    }

    async updateTask() {
        const taskId = document.getElementById('edit-task-id').value;
        const title = document.getElementById('edit-task-title').value;
        const description = document.getElementById('edit-task-description').value;
        const priority = document.getElementById('edit-task-priority').value;
        const category = document.getElementById('edit-task-category').value;
        const deadline = document.getElementById('edit-task-deadline').value;

        const updates = {
            title,
            description,
            priority,
            category,
            deadline
        };

        const updatedTask = await this.updateTaskInDB(taskId, updates);
        
        if (updatedTask) {
            this.closeEditModal();
            await this.loadTasks();
            this.showNotification('Task updated successfully!', 'success');
        }
    }

    async toggleTaskStatus(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            const updates = {
                completed: !task.completed,
                status: !task.completed ? 'completed' : 'pending'
            };
            
            await this.updateTaskInDB(taskId, updates);
            await this.loadTasks();
        }
    }

    async deleteTask(taskId) {
        if (confirm('Are you sure you want to delete this task?')) {
            await this.deleteTaskFromDB(taskId);
            await this.loadTasks();
            this.showNotification('Task deleted successfully!', 'success');
        }
    }

    editTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            document.getElementById('edit-task-id').value = task.id;
            document.getElementById('edit-task-title').value = task.title;
            document.getElementById('edit-task-description').value = task.description || '';
            document.getElementById('edit-task-priority').value = task.priority;
            document.getElementById('edit-task-category').value = task.category;
            document.getElementById('edit-task-deadline').value = task.deadline || '';
            
            document.getElementById('edit-modal').classList.add('active');
        }
    }

    closeEditModal() {
        document.getElementById('edit-modal').classList.remove('active');
    }

    renderTaskItem(task, container) {
        const taskElement = document.createElement('div');
        taskElement.className = 'task-item';
        taskElement.innerHTML = `
            <div class="task-checkbox ${task.completed ? 'checked' : ''}" onclick="app.toggleTaskStatus('${task.id}')">
                ${task.completed ? '<i class="fas fa-check"></i>' : ''}
            </div>
            <div class="task-content">
                <div class="task-title ${task.completed ? 'completed' : ''}">${task.title}</div>
                <div class="task-meta">
                    <span class="priority-badge priority-${task.priority}">${task.priority}</span>
                    <span class="category">${task.category}</span>
                    ${task.deadline ? `<span class="deadline">${new Date(task.deadline).toLocaleDateString()}</span>` : ''}
                </div>
            </div>
            <div class="task-actions">
                <button class="task-action edit" onclick="app.editTask('${task.id}')" title="Edit Task">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="task-action delete" onclick="app.deleteTask('${task.id}')" title="Delete Task">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        container.appendChild(taskElement);
    }

    renderRecentTasks() {
        const container = document.getElementById('recent-task-list');
        container.innerHTML = '';

        if (this.tasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-tasks"></i>
                    <h3>No tasks yet</h3>
                    <p>Create your first task to get started!</p>
                </div>
            `;
            return;
        }

        const recentTasks = this.tasks
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);

        recentTasks.forEach(task => {
            this.renderTaskItem(task, container);
        });
    }

    renderAllTasks() {
        const container = document.getElementById('all-tasks-list');
        container.innerHTML = '';

        let filteredTasks = [...this.tasks];

        // Apply filters
        const priorityFilter = document.getElementById('priority-filter').value;
        const statusFilter = document.getElementById('status-filter').value;

        if (priorityFilter) {
            filteredTasks = filteredTasks.filter(task => task.priority === priorityFilter);
        }

        if (statusFilter) {
            filteredTasks = filteredTasks.filter(task => task.status === statusFilter);
        }

        if (filteredTasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>No tasks found</h3>
                    <p>Try adjusting your filters or create a new task.</p>
                </div>
            `;
            return;
        }

        filteredTasks
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .forEach(task => {
                this.renderTaskItem(task, container);
            });
    }

    filterTasks() {
        this.renderAllTasks();
    }

    filterTasksByCategory(category) {
        const priorityFilter = document.getElementById('priority-filter');
        const statusFilter = document.getElementById('status-filter');
        
        // Reset filters
        priorityFilter.value = '';
        statusFilter.value = '';
        
        // Filter by category
        const container = document.getElementById('all-tasks-list');
        container.innerHTML = '';

        const categoryTasks = this.tasks.filter(task => task.category === category);

        if (categoryTasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder-open"></i>
                    <h3>No ${category} tasks</h3>
                    <p>Create your first ${category} task!</p>
                </div>
            `;
            return;
        }

        categoryTasks
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .forEach(task => {
                this.renderTaskItem(task, container);
            });
    }

    updateStats() {
        const totalTasks = this.tasks.length;
        const completedTasks = this.tasks.filter(task => task.completed).length;
        const pendingTasks = this.tasks.filter(task => !task.completed).length;
        const highPriorityTasks = this.tasks.filter(task => task.priority === 'high' && !task.completed).length;

        document.getElementById('total-tasks').textContent = totalTasks;
        document.getElementById('completed-tasks').textContent = completedTasks;
        document.getElementById('pending-tasks').textContent = pendingTasks;
        document.getElementById('high-priority-tasks').textContent = highPriorityTasks;
    }

    updateCategoryCounts() {
        const categories = ['work', 'personal', 'shopping', 'health', 'other'];
        
        categories.forEach(category => {
            const count = this.tasks.filter(task => task.category === category).length;
            const card = document.querySelector(`[data-category="${category}"] .task-count`);
            if (card) {
                card.textContent = `${count} task${count !== 1 ? 's' : ''}`;
            }
        });
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        // Add to DOM
        document.body.appendChild(notification);

        // Auto remove after 3 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 3000);
    }
}

// Global functions for inline event handlers
function showPage(pageId) {
    app.showPage(pageId);
}

function closeEditModal() {
    app.closeEditModal();
}

// Initialize app
const app = new TodoApp();

// Add notification styles
const notificationStyles = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 3000;
        min-width: 300px;
        animation: slideIn 0.3s ease;
    }
    
    .notification.success {
        border-left: 4px solid var(--success-color);
    }
    
    .notification.error {
        border-left: 4px solid var(--danger-color);
    }
    
    .notification.info {
        border-left: 4px solid var(--accent-color);
    }
    
    .notification-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
    }
    
    .notification button {
        background: none;
        border: none;
        cursor: pointer;
        color: var(--text-secondary);
        font-size: 14px;
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;

// Add notification styles to head
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);
