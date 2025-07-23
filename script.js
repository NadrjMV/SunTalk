import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { 
    doc, 
    getDoc,
    setDoc, 
    collection, 
    getDocs,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { auth, db } from './firebase-config.js';

// --- SELEÇÃO DE ELEMENTOS DO DOM ---
const loginContainer = document.getElementById('login-container');
const mainPlatform = document.getElementById('main-platform');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const showSignupBtn = document.getElementById('show-signup');
const showLoginBtn = document.getElementById('show-login');
const newsModalOverlay = document.getElementById('news-modal-overlay');
const newsModalBody = document.getElementById('news-modal-body');
const newsModalCloseBtn = document.getElementById('news-modal-close');

// --- SISTEMA DE NOTIFICAÇÃO (TOAST) ---
function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 4000);
}

// --- CONTROLE PRINCIPAL DE AUTENTICAÇÃO ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDocRef = doc(db, "users", user.uid);
        try {
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                if (userDoc.data().role === 'adm') {
                    if (!window.location.pathname.endsWith('admin.html')) {
                       window.location.replace('admin.html');
                    }
                } else {
                    loginContainer.classList.add('hidden');
                    mainPlatform.classList.remove('hidden');
                    initializePlatformLogic(userDoc.data());
                }
            } else { throw new Error("Dados do usuário não encontrados."); }
        } catch (error) {
            console.error("Erro ao verificar função do usuário:", error);
            signOut(auth);
        }
    } else {
        mainPlatform.classList.add('hidden');
        loginContainer.classList.remove('hidden');
    }
});

// --- LÓGICA DOS FORMULÁRIOS DE LOGIN E CADASTRO ---
if (loginForm) {
    const loginFormContainer = document.getElementById('login-form-container');
    const signupFormContainer = document.getElementById('signup-form-container');
    showSignupBtn.addEventListener('click', (e) => { e.preventDefault(); loginFormContainer.classList.add('hidden'); signupFormContainer.classList.remove('hidden'); });
    showLoginBtn.addEventListener('click', (e) => { e.preventDefault(); signupFormContainer.classList.add('hidden'); loginFormContainer.classList.remove('hidden'); });

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const name = document.getElementById('signup-name').value;
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await setDoc(doc(db, "users", userCredential.user.uid), {
                uid: userCredential.user.uid, name, email, role: 'colaborador'
            });
            showToast(`Bem-vindo(a), ${name}! Conta criada.`, 'success');
        } catch (error) {
            if (error.code === 'auth/email-already-in-use') showToast('Este e-mail já está cadastrado.', 'error');
            else if (error.code === 'auth/weak-password') showToast('A senha precisa ter no mínimo 6 caracteres.', 'error');
            else showToast('Erro ao cadastrar.', 'error');
        }
    });

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        signInWithEmailAndPassword(auth, email, password)
            .then(() => showToast('Login realizado com sucesso!', 'success'))
            .catch(() => showToast('E-mail ou senha incorretos.', 'error'));
    });
}

// --- FUNÇÕES DA PLATAFORMA DO COLABORADOR ---
function initializePlatformLogic(userData) {
    const mainContentSections = document.querySelectorAll('#main-platform .main-content');
    const navItems = document.querySelectorAll('#main-platform .nav-item');
    const pageTitle = document.getElementById('page-title-main');
    const pageSubtitle = document.getElementById('page-subtitle-main');
    const muralContainer = document.getElementById('mural-section');
    const logoutBtn = document.querySelector('#main-platform .sidebar-footer');
    const filterButtons = document.querySelectorAll('#main-platform .sidebar .filter-btn');

    const openNewsModal = () => newsModalOverlay.classList.remove('hidden');
    const closeNewsModal = () => newsModalOverlay.classList.add('hidden');
    newsModalCloseBtn.addEventListener('click', closeNewsModal);
    newsModalOverlay.addEventListener('click', (event) => {
        if (event.target === newsModalOverlay) closeNewsModal();
    });
    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !newsModalOverlay.classList.contains('hidden')) closeNewsModal();
    });

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            const targetId = item.dataset.target;
            mainContentSections.forEach(section => section.classList.add('hidden'));
            const sectionToShow = document.getElementById(targetId);
            if(sectionToShow) sectionToShow.classList.remove('hidden');

            if (targetId === 'mural-section') {
                pageTitle.textContent = 'Mural de Comunicados';
                pageSubtitle.textContent = `Olá, bem-vindo(a) de volta, ${userData.name.split(' ')[0]}!`;
                loadNews();
            } else if (targetId === 'profile-section') {
                pageTitle.textContent = 'Meu Perfil';
                pageSubtitle.textContent = 'Suas informações de cadastro na plataforma.';
                loadUserProfile();
            } else if (targetId === 'sites-section') {
                pageTitle.textContent = 'Sistemas SunShield';
                pageSubtitle.textContent = 'Acesso rápido às nossas plataformas e sites.';
            }
        });
    });

    function loadUserProfile() {
        document.getElementById('profile-name').textContent = userData.name;
        document.getElementById('profile-email').textContent = userData.email;
        const role = userData.role.charAt(0).toUpperCase() + userData.role.slice(1);
        document.getElementById('profile-role').textContent = role;
    }

    let newsCache = [];
    async function loadNews() {
        if(!muralContainer) return;
        muralContainer.innerHTML = '<h3>Carregando notícias...</h3>';
        try {
            const q = query(collection(db, "noticias"), orderBy("publishedAt", "desc"));
            const querySnapshot = await getDocs(q);
            muralContainer.innerHTML = '';
            newsCache = [];
            if (querySnapshot.empty) {
                muralContainer.innerHTML = '<h3>Nenhuma notícia publicada ainda.</h3>';
                return;
            }
            querySnapshot.forEach((doc) => {
                const newsData = { id: doc.id, ...doc.data() };
                newsCache.push(newsData);
                const cardHTML = createNewsCardHTML(newsData);
                muralContainer.insertAdjacentHTML('beforeend', cardHTML);
            });
        } catch (error) {
            console.error("Erro ao carregar notícias: ", error);
            showToast("Erro ao carregar notícias.", "error");
        }
    }
    
    function createNewsCardHTML(news) {
        const categoryColors = { diretoria: '#FCA311', rh: '#1E90FF', ti: '#6c757d', eventos: '#32CD32', geral: '#6f42c1' };
        const categoryColor = categoryColors[news.category] || '#6c757d';
        return `
            <div class="card" data-news-id="${news.id}" data-category="${news.category}">
                ${news.imageUrl ? `<img class="card-image" src="${news.imageUrl}" alt="Imagem da notícia">` : ''}
                <div class="card-body">
                    <div class="card-header">
                        <span class="card-category" style="background-color: ${categoryColor};">${news.category}</span>
                        <span class="card-date">${news.publishedAt.toDate().toLocaleDateString('pt-BR')}</span>
                    </div>
                    <h2 class="card-title">${news.title}</h2>
                    <p class="card-snippet">${news.content.substring(0, 100)}...</p>
                    <div class="card-footer">
                        <span>Publicado por <strong>${news.author}</strong></span>
                    </div>
                </div>
            </div>`;
    }

    muralContainer.addEventListener('click', (event) => {
        const card = event.target.closest('.card');
        if (card) {
            const newsId = card.dataset.newsId;
            const newsData = newsCache.find(n => n.id === newsId);
            if (newsData) {
                newsModalBody.innerHTML = `
                    ${newsData.imageUrl ? `<img class="modal-image" src="${newsData.imageUrl}" alt="Imagem da notícia">` : ''}
                    <div class="modal-header-info">
                        <span class="card-category" style="background-color: #FCA311;">${newsData.category}</span>
                        <h2>${newsData.title}</h2>
                        <p class="modal-meta">Por <strong>${newsData.author}</strong> em ${newsData.publishedAt.toDate().toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div class="modal-content-text">
                        ${newsData.content.replace(/\n/g, '<br>')}
                    </div>
                `;
                openNewsModal();
            }
        }
    });

    if(logoutBtn) logoutBtn.addEventListener('click', () => signOut(auth));
    
    if(filterButtons) {
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                const category = button.dataset.category;
                document.querySelectorAll('#mural-section .card').forEach(card => {
                    card.style.display = (category === 'all' || card.dataset.category === category) ? 'flex' : 'none';
                });
            });
        });
    }

    loadNews();
    pageSubtitle.textContent = `Olá, bem-vindo(a) de volta, ${userData.name.split(' ')[0]}!`;
}
