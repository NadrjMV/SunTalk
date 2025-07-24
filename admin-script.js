// Importa todas as funções necessárias do Firebase
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { 
    doc, getDoc, getDocs, collection, query, orderBy, 
    addDoc, deleteDoc, updateDoc, Timestamp 
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { auth, db } from './firebase-config.js';

// --- CONTROLE DE SEGURANÇA E INICIALIZAÇÃO ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists() && userDoc.data().role === 'adm') {
            document.body.style.display = 'flex';
            initializeAdminPanel(userDoc.data());
        } else {
            console.log("Acesso negado. Usuário não é ADM.");
            window.location.replace('index.html');
        }
    } else {
        console.log("Nenhum usuário logado.");
        window.location.replace('index.html');
    }
});

// --- SISTEMA DE NOTIFICAÇÃO (TOAST) ---
function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toast-container') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 4000);
}
function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
    return container;
}

// --- FUNÇÃO PRINCIPAL DO PAINEL DE ADMINISTRAÇÃO ---
function initializeAdminPanel(adminData) {
    console.log(`Bem-vindo(a) ao painel, ${adminData.name}!`);

    const pageTitle = document.getElementById('page-title');
    const pageSubtitle = document.getElementById('page-subtitle');
    const navItems = document.querySelectorAll('.nav-item');
    const contentSections = document.querySelectorAll('.main-content');
    const addNewsBtn = document.getElementById('add-news-btn');
    const newsListContainer = document.querySelector('.news-list-container');
    const userListContainer = document.querySelector('.user-list-container');
    const logoutBtn = document.querySelector('.sidebar-footer');
    const newsForm = document.getElementById('news-form');
    const formModal = document.getElementById('form-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const modalTitle = document.getElementById('modal-title');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            const targetSectionId = item.dataset.target;

const adminNavLinks = document.querySelectorAll('#admin-panel .sidebar .nav-item');
    adminNavLinks.forEach(link => {
        link.addEventListener('click', () => {
            // Se o menu estiver aberto, feche-o
            if (sidebar.classList.contains('active')) {
                toggleMenu();
            }
        });
    });

            contentSections.forEach(section => section.classList.add('hidden'));
            const sectionToShow = document.getElementById(targetSectionId);
            if (sectionToShow) sectionToShow.classList.remove('hidden');

            if (targetSectionId === 'news-management-section') {
                pageTitle.textContent = 'Gerenciar Notícias';
                pageSubtitle.textContent = 'Adicione, edite ou remova comunicados.';
                addNewsBtn.classList.remove('hidden');
                loadAdminNews();
            } else if (targetSectionId === 'users-management-section') {
                pageTitle.textContent = 'Gerenciar Usuários';
                pageSubtitle.textContent = 'Altere as permissões de cada usuário.';
                addNewsBtn.classList.add('hidden');
                loadUsers();
            } else if (targetSectionId === 'stats-section') {
                pageTitle.textContent = 'Estatísticas';
                pageSubtitle.textContent = 'Visão geral dos dados da plataforma.';
                addNewsBtn.classList.add('hidden');
                loadStats();
            }
        });
    });

    // -- Lógica do Botão de Logout --
    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            window.location.replace('index.html');
        } catch (error) {
            showToast('Erro ao sair da conta.', 'error');
        }
    });

    // --- SEÇÃO: GERENCIAR NOTÍCIAS ---
    const openModal = () => formModal.classList.remove('hidden');
    const closeModal = () => {
        formModal.classList.add('hidden');
        newsForm.reset();
        delete newsForm.dataset.editingId;
        modalTitle.textContent = 'Adicionar Notícia';
    };
    addNewsBtn.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    const loadAdminNews = async () => {
        newsListContainer.innerHTML = 'Carregando notícias...';
        const q = query(collection(db, "noticias"), orderBy("publishedAt", "desc"));
        const querySnapshot = await getDocs(q);
        newsListContainer.innerHTML = '';
        querySnapshot.forEach((docSnap) => {
            const news = docSnap.data();
            const newsItem = document.createElement('div');
            newsItem.className = 'news-item';
            newsItem.dataset.id = docSnap.id;
            const categoryColor = { diretoria: '#FCA311', rh: '#1E90FF', ti: '#6c757d', eventos: '#32CD32', geral: '#6f42c1' }[news.category] || '#6c757d';
            newsItem.innerHTML = `
                <div class="news-details">
                    <span class="news-category" style="background-color: ${categoryColor};">${news.category}</span>
                    <h3 class="news-title">${news.title}</h3>
                    <span class="news-date">Publicado em ${news.publishedAt.toDate().toLocaleDateString('pt-BR')}</span>
                </div>
                <div class="news-actions">
                    <button class="action-btn edit-btn"><span class="material-symbols-outlined">edit</span> Editar</button>
                    <button class="action-btn delete-btn"><span class="material-symbols-outlined">delete</span> Apagar</button>
                </div>`;
            newsListContainer.appendChild(newsItem);
        });
    };

    newsForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const editingId = newsForm.dataset.editingId;
        const newsData = {
            title: document.getElementById('title').value,
            category: document.getElementById('category').value,
            imageUrl: document.getElementById('image-url').value,
            content: document.getElementById('content').value,
            author: adminData.name,
            publishedAt: Timestamp.now()
        };
        try {
            if (editingId) {
                await updateDoc(doc(db, "noticias", editingId), newsData);
                showToast('Notícia atualizada com sucesso!', 'success');
            } else {
                await addDoc(collection(db, "noticias"), newsData);
                showToast('Notícia publicada com sucesso!', 'success');
            }
            closeModal();
            loadAdminNews();
        } catch (error) {
            showToast('Erro ao salvar notícia.', 'error');
        }
    });

    newsListContainer.addEventListener('click', async (event) => {
        const docId = event.target.closest('.news-item')?.dataset.id;
        if (!docId) return;

        if (event.target.closest('.edit-btn')) {
            const docSnap = await getDoc(doc(db, "noticias", docId));
            if (docSnap.exists()) {
                const data = docSnap.data();
                document.getElementById('title').value = data.title;
                document.getElementById('category').value = data.category;
                document.getElementById('image-url').value = data.imageUrl;
                document.getElementById('content').value = data.content;
                newsForm.dataset.editingId = docId;
                modalTitle.textContent = 'Editar Notícia';
                openModal();
            }
        }
        if (event.target.closest('.delete-btn')) {
            if (confirm('Tem certeza que deseja apagar esta notícia permanentemente?')) {
                await deleteDoc(doc(db, "noticias", docId));
                showToast('Notícia apagada.', 'info');
                loadAdminNews();
            }
        }
    });

    // --- SEÇÃO: GERENCIAR USUÁRIOS ---
    const loadUsers = async () => {
        userListContainer.innerHTML = 'Carregando usuários...';
        const userSnapshot = await getDocs(collection(db, "users"));
        userListContainer.innerHTML = '';
        userSnapshot.forEach(docSnap => {
            const user = docSnap.data();
            const userItemHTML = `
                <div class="user-item">
                    <div class="user-details">
                        <p class="user-name">${user.name}</p>
                        <p class="user-email">${user.email}</p>
                    </div>
                    <select class="user-role-selector" data-uid="${user.uid}">
                        <option value="colaborador" ${user.role === 'colaborador' ? 'selected' : ''}>Colaborador</option>
                        <option value="adm" ${user.role === 'adm' ? 'selected' : ''}>Administrador</option>
                    </select>
                </div>`;
            userListContainer.insertAdjacentHTML('beforeend', userItemHTML);
        });
    };

    userListContainer.addEventListener('change', async (event) => {
        if (event.target.classList.contains('user-role-selector')) {
            const newRole = event.target.value;
            const uid = event.target.dataset.uid;
            if (auth.currentUser.uid === uid && newRole !== 'adm') {
                showToast('Você não pode remover sua própria permissão de ADM.', 'error');
                event.target.value = 'adm';
                return;
            }
            await updateDoc(doc(db, "users", uid), { role: newRole });
            showToast('Permissão do usuário atualizada!', 'success');
        }
    });

    // --- SEÇÃO: ESTATÍSTICAS ---
    const loadStats = async () => {
        const newsSnapshot = await getDocs(collection(db, "noticias"));
        const usersSnapshot = await getDocs(collection(db, "users"));
        const users = usersSnapshot.docs.map(doc => doc.data());
        const adminCount = users.filter(u => u.role === 'adm').length;
        document.getElementById('stats-total-news').textContent = newsSnapshot.size;
        document.getElementById('stats-total-users').textContent = users.length;
        document.getElementById('stats-total-admins').textContent = adminCount;
    };

    loadAdminNews();
}
