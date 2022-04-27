import { Debugger } from "../lib/webglutils/Debugging.js";
import { CanvasAnimation } from "../lib/webglutils/CanvasAnimation.js";
import { Floor } from "../lib/webglutils/Floor.js";
import { GUI } from "./Gui.js";
import { sceneFSText, sceneVSText, floorFSText, floorVSText, skeletonFSText, skeletonVSText, sBackVSText, sBackFSText, previewFSText, previewVSText } from "./Shaders.js";
import { Mat4, Vec4, Quat } from "../lib/TSM.js";
import { CLoader } from "./AnimationFileLoader.js";
import { RenderPass } from "../lib/webglutils/RenderPass.js";
import { boneChange } from "./Gui.js";
class previewInfo {
    constructor(num, text, cPos, cT, cU, cF, cA, cN, cZ) {
        this.ind = num;
        this.txt = text;
        this.cPos = cPos;
        this.cT = cT;
        this.cU = cU;
        this.cA = cA;
        this.cN = cN;
        this.cF = cF;
        this.cZ = cZ;
    }
}
export class SkinningAnimation extends CanvasAnimation {
    constructor(canvas) {
        super(canvas);
        this.canvas2d = document.getElementById("textCanvas");
        this.ctx2 = this.canvas2d.getContext("2d");
        if (this.ctx2) {
            this.ctx2.font = "25px serif";
            this.ctx2.fillStyle = "#ffffffff";
        }
        this.ctx = Debugger.makeDebugContext(this.ctx);
        let gl = this.ctx;
        this.floor = new Floor();
        this.floorRenderPass = new RenderPass(this.extVAO, gl, floorVSText, floorFSText);
        this.sceneRenderPass = new RenderPass(this.extVAO, gl, sceneVSText, sceneFSText);
        this.skeletonRenderPass = new RenderPass(this.extVAO, gl, skeletonVSText, skeletonFSText);
        this.previewRenderPass = new RenderPass(this.extVAO, gl, previewVSText, previewFSText);
        this.gui = new GUI(this.canvas2d, this);
        this.lightPosition = new Vec4([-10, 10, -10, 1]);
        this.backgroundColor = new Vec4([0.0, 0.37254903, 0.37254903, 1.0]);
        this.previews = [];
        this.initFloor();
        this.scene = new CLoader("");
        this.initPreview();
        // Status bar
        this.sBackRenderPass = new RenderPass(this.extVAO, gl, sBackVSText, sBackFSText);
        this.hBox = 0;
        // TODO
        // Other initialization, for instance, for the bone highlighting
        this.initGui();
        this.millis = new Date().getTime();
    }
    getScene() {
        return this.scene;
    }
    /**
     * Setup the animation. This can be called again to reset the animation.
     */
    reset() {
        this.gui.reset();
        this.setScene(this.loadedScene);
    }
    initGui() {
        // Status bar background
        let verts = new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]);
        this.sBackRenderPass.setIndexBufferData(new Uint32Array([1, 0, 2, 2, 0, 3]));
        this.sBackRenderPass.addAttribute("vertPosition", 2, this.ctx.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, verts);
        this.sBackRenderPass.setDrawData(this.ctx.TRIANGLES, 6, this.ctx.UNSIGNED_INT, 0);
        this.sBackRenderPass.setup();
    }
    initScene() {
        if (this.scene.meshes.length === 0) {
            return;
        }
        this.initModel();
        this.initSkeleton();
        this.initPreview();
        this.gui.reset();
        for (let i = 0; i < this.scene.meshes[0].bones.length; i++) {
            this.gui.keyFrames[0][i] = new boneChange(new Quat().setIdentity(), i);
        }
    }
    /**
     * Sets up the mesh and mesh drawing
     */
    initModel() {
        this.sceneRenderPass = new RenderPass(this.extVAO, this.ctx, sceneVSText, sceneFSText);
        let faceCount = this.scene.meshes[0].geometry.position.count / 3;
        let fIndices = new Uint32Array(faceCount * 3);
        for (let i = 0; i < faceCount * 3; i += 3) {
            fIndices[i] = i;
            fIndices[i + 1] = i + 1;
            fIndices[i + 2] = i + 2;
        }
        this.sceneRenderPass.setIndexBufferData(fIndices);
        this.sceneRenderPass.addAttribute("vertPosition", 3, this.ctx.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, this.scene.meshes[0].geometry.position.values);
        this.sceneRenderPass.addAttribute("aNorm", 3, this.ctx.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, this.scene.meshes[0].geometry.normal.values);
        if (this.scene.meshes[0].geometry.uv) {
            this.sceneRenderPass.addAttribute("aUV", 2, this.ctx.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, this.scene.meshes[0].geometry.uv.values);
        }
        else {
            this.sceneRenderPass.addAttribute("aUV", 2, this.ctx.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, new Float32Array(this.scene.meshes[0].geometry.normal.values.length));
        }
        this.sceneRenderPass.addAttribute("skinIndices", 4, this.ctx.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, this.scene.meshes[0].geometry.skinIndex.values);
        this.sceneRenderPass.addAttribute("skinWeights", 4, this.ctx.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, this.scene.meshes[0].geometry.skinWeight.values);
        this.sceneRenderPass.addAttribute("v0", 3, this.ctx.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, this.scene.meshes[0].geometry.v0.values);
        this.sceneRenderPass.addAttribute("v1", 3, this.ctx.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, this.scene.meshes[0].geometry.v1.values);
        this.sceneRenderPass.addAttribute("v2", 3, this.ctx.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, this.scene.meshes[0].geometry.v2.values);
        this.sceneRenderPass.addAttribute("v3", 3, this.ctx.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, this.scene.meshes[0].geometry.v3.values);
        this.sceneRenderPass.addUniform("lightPosition", (gl, loc) => {
            gl.uniform4fv(loc, this.lightPosition.xyzw);
        });
        this.sceneRenderPass.addUniform("mWorld", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(new Mat4().setIdentity().all()));
        });
        this.sceneRenderPass.addUniform("mProj", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().all()));
        });
        this.sceneRenderPass.addUniform("mView", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().all()));
        });
        this.sceneRenderPass.addUniform("jTrans", (gl, loc) => {
            gl.uniform3fv(loc, this.scene.meshes[0].getBoneTranslations());
        });
        this.sceneRenderPass.addUniform("jRots", (gl, loc) => {
            gl.uniform4fv(loc, this.scene.meshes[0].getBoneRotations());
        });
        this.sceneRenderPass.setDrawData(this.ctx.TRIANGLES, this.scene.meshes[0].geometry.position.count, this.ctx.UNSIGNED_INT, 0);
        this.sceneRenderPass.setup();
    }
    /**
     * Sets up the skeleton drawing
     */
    initSkeleton() {
        this.skeletonRenderPass.setIndexBufferData(this.scene.meshes[0].getBoneIndices());
        this.skeletonRenderPass.addAttribute("vertPosition", 3, this.ctx.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, this.scene.meshes[0].getBonePositions());
        this.skeletonRenderPass.addAttribute("boneIndex", 1, this.ctx.FLOAT, false, 1 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, this.scene.meshes[0].getBoneIndexAttribute());
        this.skeletonRenderPass.addUniform("mWorld", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(Mat4.identity.all()));
        });
        this.skeletonRenderPass.addUniform("mProj", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().all()));
        });
        this.skeletonRenderPass.addUniform("mView", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().all()));
        });
        this.skeletonRenderPass.addUniform("bTrans", (gl, loc) => {
            gl.uniform3fv(loc, this.getScene().meshes[0].getBoneTranslations());
        });
        this.skeletonRenderPass.addUniform("bRots", (gl, loc) => {
            gl.uniform4fv(loc, this.getScene().meshes[0].getBoneRotations());
        });
        this.skeletonRenderPass.addUniform("highlights", (gl, loc) => {
            gl.uniform1i(loc, this.getScene().meshes[0].boneHighlighted);
        });
        this.skeletonRenderPass.setDrawData(this.ctx.LINES, this.scene.meshes[0].getBoneIndices().length, this.ctx.UNSIGNED_INT, 0);
        this.skeletonRenderPass.setup();
    }
    initPreview() {
        this.previewRenderPass = new RenderPass(this.extVAO, this.ctx, previewVSText, previewFSText);
        let verts = new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]);
        this.previewRenderPass.setIndexBufferData(new Uint32Array([1, 0, 2, 2, 0, 3]));
        var texture = this.ctx.createTexture();
        this.previewRenderPass.addTexture(texture);
        this.previewRenderPass.addUniform("hBox", (gl, loc) => {
            gl.uniform1i(loc, this.hBox);
        });
        this.previewRenderPass.addAttribute("vertPosition", 2, this.ctx.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, verts);
        this.previewRenderPass.addUniform("lightPosition", (gl, loc) => {
            gl.uniform4fv(loc, this.lightPosition.xyzw);
        });
        this.previewRenderPass.addUniform("mWorld", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(new Mat4().setIdentity().all()));
        });
        this.previewRenderPass.addUniform("mProj", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().all()));
        });
        this.previewRenderPass.addUniform("mView", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().all()));
        });
        this.previewRenderPass.setDrawData(this.ctx.TRIANGLES, 6, this.ctx.UNSIGNED_INT, 0);
        this.previewRenderPass.setup();
    }
    /**
     * Sets up the floor drawing
     */
    initFloor() {
        this.floorRenderPass.setIndexBufferData(this.floor.indicesFlat());
        this.floorRenderPass.addAttribute("aVertPos", 4, this.ctx.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, this.floor.positionsFlat());
        this.floorRenderPass.addUniform("uLightPos", (gl, loc) => {
            gl.uniform4fv(loc, this.lightPosition.xyzw);
        });
        this.floorRenderPass.addUniform("uWorld", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(Mat4.identity.all()));
        });
        this.floorRenderPass.addUniform("uProj", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().all()));
        });
        this.floorRenderPass.addUniform("uView", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().all()));
        });
        this.floorRenderPass.addUniform("uProjInv", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().inverse().all()));
        });
        this.floorRenderPass.addUniform("uViewInv", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().inverse().all()));
        });
        this.floorRenderPass.setDrawData(this.ctx.TRIANGLES, this.floor.indicesFlat().length, this.ctx.UNSIGNED_INT, 0);
        this.floorRenderPass.setup();
    }
    /** @internal
     * Draws a single frame
     *
     */
    draw() {
        // Advance to the next time step
        let curr = new Date().getTime();
        let deltaT = curr - this.millis;
        this.millis = curr;
        deltaT /= 1000;
        this.getGUI().incrementTime(deltaT);
        // TODO
        // If the mesh is animating, probably you want to do some updating of the skeleton state here
        // draw the status message
        if (this.ctx2) {
            this.ctx2.clearRect(0, 0, this.ctx2.canvas.width, this.ctx2.canvas.height);
            if (this.scene.meshes.length > 0) {
                this.ctx2.fillText(this.getGUI().getModeString(), 50, 710);
            }
        }
        // Drawing
        const gl = this.ctx;
        const bg = this.backgroundColor;
        gl.clearColor(bg.r, bg.g, bg.b, bg.a);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);
        gl.frontFace(gl.CCW);
        gl.cullFace(gl.BACK);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null); // null is the default frame buffer
        this.drawPreviews(0, 200, 800, 600);
        this.drawScene(0, 200, 800, 600);
        /* Draw status bar */
        if (this.scene.meshes.length > 0) {
            gl.viewport(0, 0, 800, 200);
            this.sBackRenderPass.draw();
        }
    }
    drawScene(x, y, width, height) {
        const gl = this.ctx;
        gl.viewport(x, y, width, height);
        this.floorRenderPass.draw();
        /* Draw Scene */
        if (this.scene.meshes.length > 0) {
            this.sceneRenderPass.draw();
            gl.disable(gl.DEPTH_TEST);
            this.skeletonRenderPass.draw();
            // TODO
            // Also draw the highlighted bone (if applicable)
            gl.enable(gl.DEPTH_TEST);
        }
    }
    setPreviewTextures(x, y, width, height) {
        for (let i = 0; i < this.gui.numKeyFrames; i++) {
            if (i >= 12) {
                return;
            }
            let newPI = this.setPreviewTexture(x, y, width, height, i);
        }
    }
    setPreviewTexture(x, y, width, height, ind, cP, cT, cU, cF, cA, cZN, cZF) {
        const gl = this.ctx;
        const targetTextureWidth = 152;
        const targetTextureHeight = 114;
        const targetTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, targetTexture);
        {
            // define size and format of level 0
            const level = 0;
            const internalFormat = gl.RGBA;
            const border = 0;
            const format = gl.RGBA;
            const type = gl.UNSIGNED_BYTE;
            const data = null;
            gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, targetTextureWidth, targetTextureHeight, border, format, type, data);
            // set the filtering so we don't need mips
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }
        const fb = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        const depthBuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, targetTextureWidth, targetTextureHeight);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);
        // attach the texture as the first color attachment
        const attachmentPoint = gl.COLOR_ATTACHMENT0;
        const level = 0;
        gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, targetTexture, level);
        gl.viewport(0, 0, targetTextureWidth, targetTextureHeight);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        this.gui.setPose(ind);
        let c = this.gui.camera;
        let oldPos = c.pos();
        let oldT = c.target();
        let oldU = c.up();
        let oldF = c.fov();
        let oldA = c.aspect();
        let oldZN = c.zNear();
        let oldZF = c.zFar();
        if (cF) {
            this.gui.setCamera(cP, cT, cU, cF, cA, cZN, cZF);
        }
        else {
            let pi = this.previews[ind];
            this.gui.setCamera(pi.cPos, pi.cT, pi.cU, pi.cF, pi.cA, pi.cN, pi.cZ);
        }
        if (this.scene.meshes.length > 0) {
            gl.enable(gl.DEPTH_TEST);
            /*this.previewBRenderPass.draw();
            this.previewMRenderPass.draw();*/
            this.floorRenderPass.draw();
            this.sceneRenderPass.draw();
            gl.disable(gl.DEPTH_TEST);
            this.skeletonRenderPass.draw();
            gl.enable(gl.DEPTH_TEST);
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        this.gui.setCamera(oldPos, oldT, oldU, oldF, oldA, oldZN, oldZF);
        // render the cube with the texture we just rendered to
        gl.bindTexture(gl.TEXTURE_2D, targetTexture);
        let newPI;
        if (cF) {
            newPI = new previewInfo(ind, targetTexture, cP, cT, cU, cF, cA, cZN, cZF);
        }
        else {
            newPI = this.previews[ind];
            newPI.txt = targetTexture;
        }
        // Tell WebGL how to convert from clip space to pixels
        if (this.previews.length > ind) {
            this.previews[ind] = newPI;
        }
        else {
            this.previews.push(newPI);
        }
        return newPI;
    }
    drawPreviews(x, y, width, height) {
        const gl = this.ctx;
        let startX = 804;
        let startY = 678;
        for (let i = 0; i < this.gui.numKeyFrames; i++) {
            let ev = i % 2;
            let lvl = Math.floor(i / 2);
            if (i >= 12) {
                return;
            }
            gl.viewport(startX + ev * 160, startY - lvl * 134, 152, 114);
            //console.log(this.previews[i],i);
            this.previewRenderPass.addTexture(this.previews[i].txt);
            this.hBox = 0;
            if (this.gui.curKeyFrame == i)
                this.hBox = 1;
            this.previewRenderPass.draw();
        }
    }
    getGUI() {
        return this.gui;
    }
    /**
     * Loads and sets the scene from a Collada file
     * @param fileLocation URI for the Collada file
     */
    setScene(fileLocation) {
        this.loadedScene = fileLocation;
        this.scene = new CLoader(fileLocation);
        this.scene.load(() => this.initScene());
    }
}
export function initializeCanvas() {
    const canvas = document.getElementById("glCanvas");
    /* Start drawing */
    const canvasAnimation = new SkinningAnimation(canvas);
    canvasAnimation.start();
    canvasAnimation.setScene("/static/assets/skinning/split_cube.dae");
}
//# sourceMappingURL=App.js.map