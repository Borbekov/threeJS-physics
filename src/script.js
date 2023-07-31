import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'lil-gui'
import CANNON from 'cannon'

/**
 * Debug
 */
const gui = new dat.GUI()
const params = {
    createBox() {
        createBox(Math.random(), Math.random(), Math.random(), {
            x: (Math.random() - 0.5) * 4,
            y: 3,
            z: (Math.random() - 0.5) * 4,
        })
    },
    reset() {
        for (const object of updatedValues) {
            object.body.removeEventListener('collide', playSound)
            world.remove(object.body)
            scene.remove(object.box)
        }
        updatedValues.length = 0
    },
}
gui.add(params, 'createBox')
gui.add(params, 'reset')

/* Physics */
// World
const world = new CANNON.World()
world.broadphase = new CANNON.SAPBroadphase(world)
world.allowSleep = true
world.gravity.set(0, -9.82, 0)

// Material
const floorMaterial = new CANNON.Material('wood')
const ballMaterial = new CANNON.Material('plastic')

const contactMaterial = new CANNON.ContactMaterial(
    floorMaterial,
    ballMaterial,
    {
        friction: 0.1,
        restitution: 0.7,
    }
)

world.addContactMaterial(contactMaterial)

// Plane
const planeShape = new CANNON.Plane()
const planeBody = new CANNON.Body({
    mass: 0,
    shape: planeShape,
    material: floorMaterial,
})
planeBody.quaternion.setFromAxisAngle(new CANNON.Vec3(-1, 0, 0), Math.PI * 0.5)
world.add(planeBody)

/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

/**
 * Textures
 */
const textureLoader = new THREE.TextureLoader()
const cubeTextureLoader = new THREE.CubeTextureLoader()

const environmentMapTexture = cubeTextureLoader.load([
    '/textures/environmentMaps/0/px.png',
    '/textures/environmentMaps/0/nx.png',
    '/textures/environmentMaps/0/py.png',
    '/textures/environmentMaps/0/ny.png',
    '/textures/environmentMaps/0/pz.png',
    '/textures/environmentMaps/0/nz.png',
])

const sound = new Audio('/sounds/hit.mp3')
const playSound = (collision) => {
    const collisionStrength = collision.contact.getImpactVelocityAlongNormal()
    if (collisionStrength > 1.5) {
        sound.volume = Math.random()
        sound.currentTime = 0
        sound.play()
    }
}

/**
 * Floor
 */
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshStandardMaterial({
        color: '#777777',
        metalness: 0.3,
        roughness: 0.4,
        envMap: environmentMapTexture,
        envMapIntensity: 0.5,
    })
)
floor.receiveShadow = true
floor.rotation.x = -Math.PI * 0.5
scene.add(floor)

/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.2)
directionalLight.castShadow = true
directionalLight.shadow.mapSize.set(1024, 1024)
directionalLight.shadow.camera.far = 15
directionalLight.shadow.camera.left = -7
directionalLight.shadow.camera.top = 7
directionalLight.shadow.camera.right = 7
directionalLight.shadow.camera.bottom = -7
directionalLight.position.set(5, 5, 5)
scene.add(directionalLight)

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
}

window.addEventListener('resize', () => {
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(
    75,
    sizes.width / sizes.height,
    0.1,
    100
)
camera.position.set(-3, 3, 3)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
})
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

const boxGeometry = new THREE.BoxGeometry(1, 1, 1)
const boxMaterial = new THREE.MeshStandardMaterial({
    envMap: environmentMapTexture,
    metalness: 0.3,
    roughness: 0.4,
})

const updatedValues = []

const createBox = (width, height, depth, position) => {
    //three js
    const box = new THREE.Mesh(boxGeometry, boxMaterial)
    box.castShadow = true
    box.scale.set(width, height, depth)
    box.position.copy(position)
    scene.add(box)

    //cannon
    const shape = new CANNON.Box(
        new CANNON.Vec3(width / 2, height / 2, depth / 1)
    )
    const body = new CANNON.Body({
        mass: 1,
        shape,
        material: ballMaterial,
    })
    body.position.copy(position)
    body.addEventListener('collide', playSound)
    world.add(body)

    updatedValues.push({ box, body })
}

createBox(Math.random(), Math.random(), Math.random(), {
    x: Math.random() - 0.5,
    y: 3,
    z: Math.random() - 0.5,
})

/**
 * Animate
 */
const clock = new THREE.Clock()
let oldElapsedTime = 0

const tick = () => {
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - oldElapsedTime
    oldElapsedTime = elapsedTime

    // sphereBody.applyForce(new CANNON.Vec3(-0.5, 0, 0), sphereBody.position)
    // sphere.position.copy(sphereBody.position)

    for (const object of updatedValues) {
        object.box.position.copy(object.body.position)
        object.box.quaternion.copy(object.body.quaternion)
    }
    world.step(1 / 60, deltaTime, 3)

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()
