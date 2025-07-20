// studio_logic.js - Final version with all features, including corrected card animation.

let scene, renderer, camera, controls, modelGroup;
let arStream = null, arMode = false, currentModels = [], selectedModelIndex = -1;
let animationEnabled = true, wireframeEnabled = false, selectedModelName = "All Models";
let mixers = [];
const clock = new THREE.Clock();
let rotationSpeed = 0.005;
let animationFrameId = null;

const defaultModels = [
    { path: 'https://cdn.statically.io/gh/Bedo77/3d-model-viewer/main/Science/grade_one/models/3D%20habitat%20explorer.glb', name: '3D Habitat Explorer' },
    { path: 'https://cdn.statically.io/gh/Bedo77/3d-model-viewer/main/Science/grade_one/models/3D%20water%20cycle%20model.glb', name: '3D Water Cycle' },
    { path: 'https://cdn.statically.io/gh/Bedo77/3d-model-viewer/main/Science/grade_one/models/Drum%20vibration%20simulator.glb', name: 'Drum Vibration Simulator' },
    { path: 'https://cdn.statically.io/gh/Bedo77/3d-model-viewer/main/Science/grade_one/models/Gas%20particle%20motion%20simulator.glb', name: 'Gas Particle Simulator' },
    { path: 'https://cdn.statically.io/gh/Bedo77/3d-model-viewer/main/Science/grade_one/models/Insect_Anatomy.glb', name: 'Insect Anatomy' },
    { path: 'https://cdn.statically.io/gh/Bedo77/3d-model-viewer/main/Science/grade_one/models/Interactive%20force%20simulator.glb', name: 'Interactive Force Simulator' }
];

// --- MAIN SETUP ---
// There is only ONE DOMContentLoaded listener wrapping all the setup logic.
document.addEventListener('DOMContentLoaded', () => {
    
    // --- Contact Form Modal Listeners ---
    const mainCtaButton = document.getElementById('main-cta-button');
    const contactModal = document.getElementById('contactModal');
    if(mainCtaButton && contactModal) {
        mainCtaButton.addEventListener('click', (e) => {
            e.preventDefault();
            contactModal.classList.add('visible');
        });
    }

    // --- Showcase Controls Listeners ---
    document.getElementById('wireframeToggle').addEventListener('change', (e) => {
        wireframeEnabled = e.target.checked;
        updateWireframe(wireframeEnabled);
    });

    document.getElementById('dropdownSelected').addEventListener('click', () => {
        const items = document.getElementById('dropdownItems');
        items.style.display = items.style.display === 'block' ? 'none' : 'block';
    });

    document.getElementById('animationToggle').addEventListener('change', (e) => {
        animationEnabled = e.target.checked;
        mixers.forEach(mixer => mixer._actions.forEach(action => animationEnabled ? action.play() : action.stop()));
    });
    
    document.getElementById('arToggle').addEventListener('change', (e) => {
        arMode = e.target.checked;
        if (!arMode && arStream) {
            arStream.getTracks().forEach(track => track.stop());
            arStream = null;
        }
        loadModels(defaultModels, 'showcaseViewport', selectedModelIndex);
    });

 // --- Modal & Form Handling ---
    const closeModalBtn = document.getElementById('closeModalBtn');
    const contactForm = document.getElementById('contactForm');
    const successNotification = document.getElementById('successNotification');

    // Logic to make the close button work
    if (closeModalBtn && contactModal) {
        closeModalBtn.addEventListener('click', () => {
            contactModal.classList.remove('visible');
        });
    }

    // Logic to allow closing the modal by clicking on the background
    if (contactModal) {
        contactModal.addEventListener('click', (e) => {
            if (e.target === contactModal) { // Only if the click is on the background itself
                contactModal.classList.remove('visible');
            }
        });
    }

    // Logic to handle form submission, show notification, and stay on the page
    if (contactForm && contactModal && successNotification) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault(); // Prevents the browser from navigating away

            const formData = new FormData(contactForm);
            const action = contactForm.getAttribute('action');

            // Send the form data in the background
            fetch(action, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            }).then(response => {
                if (response.ok) {
                    contactForm.reset(); // Clear the form fields
                    contactModal.classList.remove('visible'); // Hide the form modal
                    
                    successNotification.classList.add('show'); // Show the success notification
                    
                    // Hide the notification automatically after 5 seconds
                    setTimeout(() => {
                        successNotification.classList.remove('show');
                    }, 5000);
                } else {
                    alert('Oops! There was a problem submitting your form. Please try again.');
                }
            }).catch(error => {
                console.error('Form submission error:', error);
                alert('Oops! There was a problem submitting your form. Please try again.');
            });
        });
    }

    // ===================================================================
    // END: New block for form and close button logic
    // ===================================================================

    // --- Initial Function Calls ---
    startTypewriter();
    loadModels(defaultModels, 'showcaseViewport');

    // --- CORRECTED: Re-animating On-Scroll for Feature Cards ---
    // This code is now inside the one and only main setup listener.
    const featureCards = document.querySelectorAll('.feature-card');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
            } else {
                entry.target.classList.remove('is-visible');
            }
        });
    }, {
        threshold: 0.1
    });

    featureCards.forEach(card => {
        observer.observe(card);
    });

}); // <-- This is the single, correct closing bracket for DOMContentLoaded.

// --- GLOBAL FUNCTIONS ---
// These functions are defined outside the listener so they are globally accessible.

function animate() {
    animationFrameId = requestAnimationFrame(animate);
    if (document.hidden) return;
    if (selectedModelIndex === -1 && modelGroup) modelGroup.rotation.y += rotationSpeed;
    if (mixers.length > 0) {
        const delta = clock.getDelta();
        mixers.forEach(mixer => mixer.update(delta));
    }
    if (controls) controls.update();
    if (renderer && scene && camera) renderer.render(scene, camera);
}

function loadModels(models, viewportId, singleModelIndex = -1) {
    currentModels = models;
    selectedModelIndex = singleModelIndex;
    const isSingleModel = selectedModelIndex >= 0;
    const displayModels = isSingleModel ? [models[selectedModelIndex]] : models;

    const viewport = document.getElementById(viewportId);
    if (!viewport) return;

    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    viewport.innerHTML = `<div id="loadingMessage"><div class="loader"></div></div>`;
    mixers = [];
    
    document.getElementById('animationToggleRow').style.display = isSingleModel ? 'flex' : 'none';
    document.getElementById('modelScaleLabel').style.display = isSingleModel ? 'block' : 'none';
    document.getElementById('rotationSpeedLabel').style.display = isSingleModel ? 'none' : 'block';

    const dropdownItemsContainer = document.getElementById('dropdownItems');
    dropdownItemsContainer.innerHTML = `
        <div class="dropdown-item" data-value="-1">All Models</div>
        ${currentModels.map((m, i) => `<div class="dropdown-item" data-value="${i}">${m.name}</div>`).join('')}
    `;
    dropdownItemsContainer.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
            selectedModelName = item.textContent;
            document.getElementById('dropdownSelected').textContent = selectedModelName;
            dropdownItemsContainer.style.display = 'none';
            loadModels(currentModels, viewportId, parseInt(item.getAttribute('data-value')));
        });
    });

    if (arMode) {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            .then(stream => {
                arStream = stream;
                const video = document.createElement('video');
                video.srcObject = stream;
                video.autoplay = true;
                video.playsInline = true;
                video.style.cssText = 'position:absolute; width:100%; height:100%; object-fit:cover; z-index:0;';
                viewport.prepend(video);
                initializeScene(viewport, displayModels, isSingleModel, true);
            }).catch(err => {
                console.error("AR camera access denied:", err);
                arMode = false;
                document.getElementById('arToggle').checked = false;
                initializeScene(viewport, displayModels, isSingleModel, false);
            });
    } else {
        initializeScene(viewport, displayModels, isSingleModel, false);
    }
}

function initializeScene(viewport, modelsToLoad, isSingleModel, isAr) {
    scene = new THREE.Scene();
    if (!isAr) scene.background = new THREE.Color(0x000000);

    camera = new THREE.PerspectiveCamera(75, viewport.clientWidth / viewport.clientHeight, 0.1, 1000);
    camera.position.set(0, 5, isSingleModel ? 10 : 25);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(viewport.clientWidth, viewport.clientHeight);
    renderer.setClearColor(0x000000, isAr ? 0 : 1);
    viewport.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    scene.add(new THREE.AmbientLight(0xffffff, 2.0));
    const dirLight = new THREE.DirectionalLight(0xffffff, 3.0);
    dirLight.position.set(5, 10, 7.5);
    scene.add(dirLight);

    modelGroup = new THREE.Group();
    scene.add(modelGroup);
    
    const loadingMessageEl = document.getElementById('loadingMessage');
    const loader = new THREE.GLTFLoader();
    const radius = 12;
    const angleIncrement = (Math.PI * 2) / modelsToLoad.length;
    
    loadingMessageEl.style.display = 'flex';

    function loadNextModel(index) {
        if (index >= modelsToLoad.length) {
            if (index === 1) loadingMessageEl.style.display = 'none';
            if (!isSingleModel) setCameraTarget(modelGroup);
            return;
        }

        const modelData = modelsToLoad[index];
        loader.load(modelData.path, (gltf) => {
            const model = gltf.scene;
            adjustModel(model);

            if (gltf.animations && gltf.animations.length > 0) {
                const mixer = new THREE.AnimationMixer(model);
                gltf.animations.forEach(clip => {
                    const action = mixer.clipAction(clip);
                    if (isSingleModel && animationEnabled) action.play();
                });
                mixers.push(mixer);
            }
            
            if (!isSingleModel) {
                const angle = angleIncrement * index;
                model.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
            }
            modelGroup.add(model);

            if (index === 0) {
                setCameraTarget(model);
                loadingMessageEl.style.display = 'none';
            }

            loadNextModel(index + 1);
        },
        undefined,
        (error) => {
            console.error(`Failed to load model: ${modelData.name}`, error);
            loadNextModel(index + 1);
        });
    }

    loadNextModel(0);
    animate();
}

function setCameraTarget(targetObject) {
    const box = new THREE.Box3().setFromObject(targetObject);
    const center = new THREE.Vector3();
    box.getCenter(center);
    if (controls) {
        controls.target.copy(center);
    }
}

function adjustModel(object) {
    object.traverse((child) => {
        if (child.isMesh) {
            child.material.wireframe = wireframeEnabled;
        }
    });
    const box = new THREE.Box3().setFromObject(object);
    const center = new THREE.Vector3();
    box.getCenter(center);
    object.position.sub(center);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 5.0 / maxDim;
    object.scale.set(scale, scale, scale);
}

function updateWireframe(enabled) {
    if (!scene) return;
    scene.traverse((object) => {
        if (object.isMesh) {
            if (Array.isArray(object.material)) {
                object.material.forEach(mat => mat.wireframe = enabled);
            } else {
                object.material.wireframe = enabled;
            }
        }
    });
}

function updateAmbientLight(value) { if(scene) scene.traverse(o => { if(o.isAmbientLight) o.intensity = parseFloat(value); }); }
function updateRotationSpeed(value) { rotationSpeed = parseFloat(value); }
function updateBackgroundColor(value) { if(scene && !arMode) scene.background.set(value); }
function updateModelScale(value) {
    if (selectedModelIndex >= 0 && modelGroup.children.length > 0) {
        const s = parseFloat(value);
        modelGroup.children[0].scale.set(s,s,s);
        setCameraTarget(modelGroup.children[0]);
    }
}

function startTypewriter() {
    const typingTextElement = document.getElementById('typing-text');
    if (!typingTextElement) return;

    const words = ["Science", "Technology", "Engineering", "Arts", "Mathematics"];
    let wordIndex = 0;
    let letterIndex = 0;
    let isDeleting = false;

    function type() {
        const currentWord = words[wordIndex];
        let displayText = '';
        
        if (isDeleting) {
            displayText = currentWord.substring(0, letterIndex - 1);
            letterIndex--;
        } else {
            displayText = currentWord.substring(0, letterIndex + 1);
            letterIndex++;
        }
        
        typingTextElement.textContent = displayText;

        let typeSpeed = isDeleting ? 100 : 200;

        if (!isDeleting && letterIndex === currentWord.length) {
            typeSpeed = 2000;
            isDeleting = true;
        } else if (isDeleting && letterIndex === 0) {
            typeSpeed = 500;
            isDeleting = false;
            wordIndex = (wordIndex + 1) % words.length;
        }
        
        setTimeout(type, typeSpeed);
    }
    
    type();
}