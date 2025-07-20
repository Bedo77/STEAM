// Enhanced hero_animation.js with timing controls and fixed slogan

document.addEventListener('DOMContentLoaded', () => {
    const heroCanvas = document.getElementById('hero-canvas');
    if (heroCanvas) {
        // --- Scene Setup ---
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ canvas: heroCanvas, alpha: true, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);

        const clock = new THREE.Clock();
        const contentGroup = new THREE.Group();
        scene.add(contentGroup);

        // --- TIMING CONFIGURATION ---
        const TIMING_CONFIG = {
            // Animation speed (higher = faster, lower = slower)
            animationSpeed: 15000, // Total animation duration in ms
            
            // Delay before images appear after text (in ms)
            imageDelay: 1000,
            
            // How long images take to fully fade in (in ms)
            imageFadeInDuration: 2000,
            
            // Distance thresholds for text and image visibility
            textVisibilityDistance: 35,
            imageVisibilityDistance: 25, // Closer = images appear later
            
            // Fade speeds (higher = faster fade, lower = slower)
            textFadeSpeed: 0.1,
            imageFadeSpeed: 0.05, // Slower fade for images
            
            // Image appearance delay multiplier per section
            imageDelayMultiplier: 1.2 // Each section's images delay slightly more
        };

        // --- Loading Manager for textures only ---
        const textureLoadingManager = new THREE.LoadingManager();
        const textureLoader = new THREE.TextureLoader(textureLoadingManager);
        
        // --- Font Loading (separate from texture loading) ---
        const fontLoader = new THREE.FontLoader();

        // --- Particle Background ---
        const particlesGeometry = new THREE.BufferGeometry();
        const particlesCount = 7000;
        const posArray = new Float32Array(particlesCount * 3);
        for (let i = 0; i < particlesCount * 3; i++) {
            posArray[i] = (Math.random() - 0.5) * 400;
        }
        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        const particlesMaterial = new THREE.PointsMaterial({ 
            size: 0.25, 
            color: 0xffffff, 
            transparent: true, 
            blending: THREE.AdditiveBlending, 
            opacity: 0.8 
        });
        const particleMesh = new THREE.Points(particlesGeometry, particlesMaterial);
        scene.add(particleMesh);

        // --- BASE Materials & Variables ---
        const orangeMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xf46c27, 
            emissive: 0xf46c27, 
            metalness: 0.7, 
            roughness: 0.5, 
            transparent: true, 
            opacity: 0 
        });
        const whiteMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffffff, 
            emissive: 0xffffff, 
            metalness: 0.7, 
            roughness: 0.5, 
            transparent: true, 
            opacity: 0 
        });
        
        const discoveryPoints = [];
        const imagePoints = []; // Separate array for images
        const textPoints = []; // Separate array for text
        let helvetikerFont;
        let finalSceneGroup;
        let sloganMesh; // Add reference to slogan mesh
        let sceneBuilt = false;
        let animationStartTime = 0;

        // --- Camera Path ---
        const cameraPath = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 0, 50), 
            new THREE.Vector3(10, 2, 0), 
            new THREE.Vector3(-10, -2, -80),
            new THREE.Vector3(10, 2, -160), 
            new THREE.Vector3(-10, -2, -240), 
            new THREE.Vector3(0, 0, -320)
        ]);
        
        const dummyCam = new THREE.Object3D();
        const START_PROGRESS = 0.05;
        let animationState = { progress: START_PROGRESS };
        let cameraTween;

        function startAnimation() {
            if (cameraTween) cameraTween.stop();
            animationState.progress = START_PROGRESS;
            animationStartTime = Date.now();
            
            cameraTween = new TWEEN.Tween(animationState)
                .to({ progress: 1 }, TIMING_CONFIG.animationSpeed)
                .easing(TWEEN.Easing.Sinusoidal.InOut)
                .onComplete(() => setTimeout(startAnimation, 7000))
                .start();
        }

        // --- Helper Functions ---
        function createImagePlane(url, position, size, needsRotation, sectionIndex) {
            console.log(`Creating image plane for: ${url}`);
            
            const texture = textureLoader.load(
                url,
                function(texture) {
                    console.log(`✅ Texture loaded successfully: ${url}`);
                    material.needsUpdate = true;
                },
                function(xhr) {
                    console.log(`Loading progress for ${url}: ${(xhr.loaded / xhr.total * 100)}%`);
                },
                function(err) {
                    console.error(`❌ Failed to load texture: ${url}`, err);
                }
            );
            
            const material = new THREE.MeshBasicMaterial({ 
                map: texture, 
                transparent: true, 
                opacity: 1, // Changed from 0 to 1
                side: THREE.DoubleSide,
                alphaTest: 0.1 // Added for clarity
            });
            
            const geometry = new THREE.PlaneGeometry(size.width, size.height);
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.copy(position);
            
            if (needsRotation) {
                mesh.rotation.y = Math.PI;
            }
            
            // Enhanced user data for timing control
            mesh.userData = {
                imageUrl: url,
                isImage: true,
                sectionIndex: sectionIndex,
                delayTime: TIMING_CONFIG.imageDelay * (1 + sectionIndex * TIMING_CONFIG.imageDelayMultiplier * 0.1),
                hasStartedFading: false,
                fadeStartTime: 0
            };
            
            contentGroup.add(mesh);
            imagePoints.push(mesh);
            discoveryPoints.push(mesh);
            
            return mesh;
        }

        function createText(text, size, position, material, needsRotation) {
            const geometry = new THREE.TextGeometry(text, { 
                font: helvetikerFont, 
                size, 
                height: 0.2, 
                curveSegments: 12, 
                bevelEnabled: true, 
                bevelThickness: 0.03, 
                bevelSize: 0.02, 
                bevelSegments: 5 
            });
            geometry.center();
            const mesh = new THREE.Mesh(geometry, material.clone());
            mesh.position.copy(position);
            if (needsRotation) mesh.rotation.y = Math.PI;
            
            mesh.userData = {
                isText: true,
                hasStartedFading: false
            };
            
            contentGroup.add(mesh);
            textPoints.push(mesh);
            discoveryPoints.push(mesh);
            
            return mesh;
        }

        function buildHeroScene() {
            console.log("🎬 Building hero scene...");
            
            // Create text elements first
            createText('SCIENCE', 5, new THREE.Vector3(25, 0, -25), orangeMaterial, true);
            createText('TECHNOLOGY', 5, new THREE.Vector3(-25, 0, -105), whiteMaterial, true);
            createText('ENGINEERING', 5, new THREE.Vector3(25, 0, -185), orangeMaterial, true);
            createText('ART', 5, new THREE.Vector3(-25, 0, -265), whiteMaterial, true);
            
            console.log("✅ Text elements created");
            
            // Create image planes with section indices for timing
            console.log("🖼️ Creating image planes...");
            
            createImagePlane('assets/dna1.png', new THREE.Vector3(0, 0, -30), { width: 10, height: 10 }, false, 0);
            createImagePlane('assets/chip1.png', new THREE.Vector3(0, 0, -110), { width: 10, height: 10 }, false, 1);
            createImagePlane('assets/gear1.png', new THREE.Vector3(0, 0, -190), { width: 10, height: 10 }, false, 2);
            createImagePlane('assets/geometry1.png', new THREE.Vector3(0, 0, -270), { width: 10, height: 10 }, false, 3);

            console.log(`Total discovery points: ${discoveryPoints.length}`);
            
            // Final logo and slogan - WITH FIXED POSITIONING AND COLORS
            const finalLogo = createImagePlane('assets/Logo.png', new THREE.Vector3(0, 8, -380), { width: 120, height: 60 }, false, 4);

            // Create "Learning" text (Text Muted #a0a0a0)
            //
// --- REPLACE WITH THIS CODE BLOCK (Updated) ---
//

// Create "Learning" text (White, matching "STEAM")
const learningGeometry = new THREE.TextGeometry('Learning', {
    font: helvetikerFont,
    size: 4.5,
    height: 0.3,
    curveSegments: 12,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.03,
    bevelSegments: 8
});
learningGeometry.center();

const learningMaterial = new THREE.MeshStandardMaterial({
    color: 0xf0f0f0, // White color from --text-light
    emissive: 0xf0f0f0, // Emissive for glow effect
    emissiveIntensity: 1.0, // Base glow intensity
    metalness: 0.3,
    roughness: 0.4,
    transparent: true,
    opacity: 0
});

const learningMesh = new THREE.Mesh(learningGeometry, learningMaterial);

// Create "Re-imagined" text (Orange, matching "Studio")
const reimaginedGeometry = new THREE.TextGeometry('Re-imagined', {
    font: helvetikerFont,
    size: 4.5,
    height: 0.3,
    curveSegments: 12,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.03,
    bevelSegments: 8
});
reimaginedGeometry.center();

const reimaginedMaterial = new THREE.MeshStandardMaterial({
    color: 0xf46c27, // Orange color from --accent-orange
    emissive: 0xf46c27, // Emissive for glow effect
    emissiveIntensity: 1.2, // Base glow intensity for orange
    metalness: 0.2,
    roughness: 0.3,
    transparent: true,
    opacity: 0
});

const reimaginedMesh = new THREE.Mesh(reimaginedGeometry, reimaginedMaterial);

// FIXED SPACING - Increased distance between words
learningMesh.position.set(-17, 0, 0); // Moved further left
reimaginedMesh.position.set(17, 0, 0); // Moved further right

// Set userData for both meshes
learningMesh.userData = {
    isSlogan: true,
    hasStartedFading: false,
    customMaterial: true
};

reimaginedMesh.userData = {
    isSlogan: true,
    hasStartedFading: false,
    customMaterial: true
};

// Create a group to hold both text meshes
sloganMesh = new THREE.Group();
sloganMesh.add(learningMesh, reimaginedMesh);
sloganMesh.position.set(0, -20, -380); // Position below logo

            // Remove logo from imagePoints so it doesn't get animated by the main system
            const logoIndex = imagePoints.indexOf(finalLogo);
            if (logoIndex > -1) {
                imagePoints.splice(logoIndex, 1);
            }

            finalSceneGroup = new THREE.Group();
            finalSceneGroup.add(finalLogo, sloganMesh);
            finalSceneGroup.visible = false;
            contentGroup.add(finalSceneGroup);
            
            sceneBuilt = true;
            console.log("🎬 Hero scene build complete");
        }

        // --- Enhanced Animation Loop ---
        function animate() {
            requestAnimationFrame(animate);
            TWEEN.update();
            const elapsedTime = clock.getElapsedTime();
            const currentTime = Date.now();
            
            particleMesh.rotation.y = elapsedTime * 0.02;
            particleMesh.position.copy(camera.position);
            
            const pulse = Math.sin(elapsedTime * 2.5) * 0.4 + 1.1;
            orangeMaterial.emissiveIntensity = pulse;
            whiteMaterial.emissiveIntensity = pulse;
            
            // Apply pulse-glow animation to slogan materials
           //
// --- REPLACE WITH THIS IF BLOCK (Updated) ---
//

if (sloganMesh && sloganMesh.children) {
    const pulseGlow = Math.sin(elapsedTime * 2.5) * 0.3 + 1.0; // Pulse effect
    sloganMesh.children.forEach(child => {
        if (child.material) {
            // Check for the new colors to apply the pulse
            if (child.material.color.getHex() === 0xf0f0f0) { // Check for white
                child.material.emissiveIntensity = 1.0 * pulseGlow; // "Learning" glow
            } else if (child.material.color.getHex() === 0xf46c27) { // Check for orange
                child.material.emissiveIntensity = 1.2 * pulseGlow; // "Re-imagined" glow
            }
        }
    });
}
            
            const progress = animationState.progress;
            camera.position.copy(cameraPath.getPointAt(progress));
            dummyCam.position.copy(camera.position);
            const lookAtProgress = Math.min(progress + 0.01, 1);
            dummyCam.lookAt(cameraPath.getPointAt(lookAtProgress));
            camera.quaternion.slerp(dummyCam.quaternion, 0.08);

            if (sceneBuilt) {
                // Animate text elements (immediate response)
                textPoints.forEach((point) => {
                    const distance = camera.position.distanceTo(point.position);
                    const targetOpacity = Math.max(0, 1 - (distance - TIMING_CONFIG.textVisibilityDistance) / 30);
                    point.material.opacity = THREE.MathUtils.lerp(
                        point.material.opacity, 
                        targetOpacity, 
                        TIMING_CONFIG.textFadeSpeed
                    );
                });

                // Animate image elements (with delay)
                imagePoints.forEach((point) => {
                    const distance = camera.position.distanceTo(point.position);
                    const shouldBeVisible = distance < TIMING_CONFIG.imageVisibilityDistance;
                    
                    if (shouldBeVisible && !point.userData.hasStartedFading) {
                        // Check if enough time has passed since animation started
                        const timeSinceStart = currentTime - animationStartTime;
                        if (timeSinceStart >= point.userData.delayTime) {
                            point.userData.hasStartedFading = true;
                            point.userData.fadeStartTime = currentTime;
                            console.log(`🖼️ Starting fade for image: ${point.userData.imageUrl}`);
                        }
                    }
                    
                    let targetOpacity = 0;
                    if (point.userData.hasStartedFading) {
                        const fadeElapsed = currentTime - point.userData.fadeStartTime;
                        const fadeProgress = Math.min(fadeElapsed / TIMING_CONFIG.imageFadeInDuration, 1);
                        
                        // Only show if still within distance
                        if (shouldBeVisible) {
                            targetOpacity = fadeProgress;
                        }
                    }
                    
                    point.material.opacity = THREE.MathUtils.lerp(
                        point.material.opacity, 
                        targetOpacity, 
                        TIMING_CONFIG.imageFadeSpeed
                    );
                });
            }
            
            if (finalSceneGroup && progress > 0.95) {
                finalSceneGroup.visible = true;
                
                // Animate slogan fade in with pulse-glow effect
                if (sloganMesh && sloganMesh.children) {
                    const fadeProgress = Math.min((progress - 0.95) / 0.05, 1);
                    sloganMesh.children.forEach(child => {
                        if (child.material) {
                            child.material.opacity = fadeProgress;
                        }
                    });
                }
            } else if (finalSceneGroup) {
                finalSceneGroup.visible = false;
                if (sloganMesh && sloganMesh.children) {
                    sloganMesh.children.forEach(child => {
                        if (child.material) {
                            child.material.opacity = 0;
                        }
                    });
                }
            }
            
            renderer.render(scene, camera);
        }

        // --- Load Font First, Then Build Scene ---
        fontLoader.load('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/fonts/helvetiker_bold.typeface.json', (font) => {
            helvetikerFont = font;
            console.log("✅ Font loaded successfully");
            buildHeroScene();
            
            // Start animation immediately after scene is built
            animate();
            startAnimation();
        });

        // --- Event Listeners ---
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                // Animation already started after font load
            } else {
                cameraTween?.stop();
            }
        }, { threshold: 0.1 });
        observer.observe(heroCanvas);
        
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    // --- Particle Canvas Setup Functions ---
    function setupParticleCanvas(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });

        const particlesGeometry = new THREE.BufferGeometry();
        const particlesCount = 2000;
        const posArray = new Float32Array(particlesCount * 3);
        for (let i = 0; i < particlesCount * 3; i++) {
            posArray[i] = (Math.random() - 0.5) * 20;
        }
        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        const particlesMaterial = new THREE.PointsMaterial({ 
            size: 0.05, 
            color: 0xffffff, 
            transparent: true, 
            blending: THREE.AdditiveBlending, 
            opacity: 0.7 
        });
        const particleMesh = new THREE.Points(particlesGeometry, particlesMaterial);
        scene.add(particleMesh);
        camera.position.z = 10;

        function animateParticles() {
            requestAnimationFrame(animateParticles);
            particleMesh.rotation.x += 0.0002;
            particleMesh.rotation.y += 0.0005;
            renderer.render(scene, camera);
        }
        animateParticles();

        const resizeObserver = new ResizeObserver(() => {
            const width = canvas.clientWidth;
            const height = canvas.clientHeight;
            if (width > 0 && height > 0) {
                renderer.setSize(width, height, false);
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
            }
        });
        resizeObserver.observe(canvas.parentElement);
    }

    setupParticleCanvas('footer-canvas');
    setupParticleCanvas('cta-canvas');
});