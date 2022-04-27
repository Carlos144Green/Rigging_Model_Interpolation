import { Camera } from "../lib/webglutils/Camera.js";
import { Vec3, Vec4, Mat3, Quat } from "../lib/TSM.js";
export var Mode;
(function (Mode) {
    Mode[Mode["playback"] = 0] = "playback";
    Mode[Mode["edit"] = 1] = "edit";
})(Mode || (Mode = {}));
export class boneChange {
    constructor(theRot, theID) {
        this.rot = theRot.copy();
        this.bID = theID;
    }
}
/**
 * Handles Mouse and Button events along with
 * the the camera.
 */
export class GUI {
    /**
     *
     * @param canvas required to get the width and height of the canvas
     * @param animation required as a back pointer for some of the controls
     * @param sponge required for some of the controls
     */
    constructor(canvas, animation) {
        this.hoverX = 0;
        this.hoverY = 0;
        this.height = canvas.height;
        this.viewPortHeight = this.height - 200;
        this.width = canvas.width - 320;
        this.prevX = 0;
        this.prevY = 0;
        this.animation = animation;
        this.reset();
        this.registerEventListeners(canvas);
        this.curRotQuat = new Quat();
        this.curRotQuat.setIdentity();
        this.curKeyFrame = -1;
        this.numKeyFrames = 0;
        this.keyFrames = [[]];
    }
    getNumKeyFrames() {
        // TODO
        // Used in the status bar in the GUI
        return this.numKeyFrames;
    }
    getTime() { return this.time; }
    getMaxTime() {
        // TODO
        // The animation should stop after the last keyframe
        return this.numKeyFrames - 1;
    }
    /**
     * Resets the state of the GUI
     */
    reset() {
        this.fps = false;
        this.dragging = false;
        this.time = 0;
        this.mode = Mode.edit;
        this.camera = new Camera(new Vec3([0, 0, -6]), new Vec3([0, 0, 0]), new Vec3([0, 1, 0]), 45, this.width / this.viewPortHeight, 0.1, 1000.0);
        for (let i = 0; i <= this.numKeyFrames; i++) {
            if (i < 12) {
                this.animation.previews[i];
            }
            for (let j = 0; j < this.animation.getScene().meshes[0].bones.length; j++) {
                this.keyFrames[i][j] = new boneChange(new Quat().setIdentity(), j);
            }
        }
        this.numKeyFrames = 0;
    }
    /**
     * Sets the GUI's camera to the given camera
     * @param cam a new camera
     */
    setCamera(pos, target, upDir, fov, aspect, zNear, zFar) {
        this.camera = new Camera(pos, target, upDir, fov, aspect, zNear, zFar);
    }
    getCamera() {
        return [this.camera.pos, this.camera.target, this.camera.up, this.camera.fov, this.camera.aspect, this.camera.zNear, this.camera.zFar];
    }
    /**
     * Returns the view matrix of the camera
     */
    viewMatrix() {
        return this.camera.viewMatrix();
    }
    /**
     * Returns the projection matrix of the camera
     */
    projMatrix() {
        return this.camera.projMatrix();
    }
    /**
     * Callback function for the start of a drag event.
     * @param mouse
     */
    dragStart(mouse) {
        if (mouse.offsetX > 800) {
            console.log("HIIII");
            let startX = 804;
            let startY = 8;
            this.curKeyFrame = -1;
            for (let i = 0; i < this.numKeyFrames; i++) {
                let ev = i % 2;
                let lvl = Math.floor(i / 2);
                if (i >= 12) {
                    return;
                }
                let myX = startX + ev * 160;
                let myY = startY + lvl * 134;
                if ((mouse.offsetX >= myX && mouse.offsetX <= myX + 152) && (mouse.offsetY >= myY && mouse.offsetY <= myY + 114)) {
                    this.curKeyFrame = i;
                    return;
                }
            }
            //we need some data structure that represents a keyframe that has the x/y  min/max coords on the page
            //so we can check if the click is on a panel and then perform whatever actions accordingly.
            /*
            for(let i=0; i<this.panels.length;i++){
              let P: Panel = this.panels[i];
              if((mouse.offsetX>=P.minX&&mouse.offsetX<=P.maxX)&&(mouse.offsetY>=P.minY&&mouse.OffsetY<=P.maxY))){
                //we have selected this panel, set it as the selected panel
              }
            }
            if none of the panels get clicked, set the selected panel to -1
            */
            return;
        }
        if (mouse.offsetY > 600) {
            // outside the main panel
            return;
        }
        // TODO
        // Some logic to rotate the bones, instead of moving the camera, if there is a currently highlighted bone
        this.dragging = true;
        this.prevX = mouse.screenX;
        this.prevY = mouse.screenY;
        this.curRotQuat.setIdentity();
    }
    setPose(t) {
        let CS = Math.floor(t);
        let NS = Math.floor(t) + 1;
        console.log(t, CS, NS);
        let curKF = this.keyFrames[CS];
        let nextKF = this.keyFrames[NS];
        let interpT = t - CS;
        for (let i = 0; i < nextKF.length; i++) {
            let slerpTI = Quat.slerp(curKF[i].rot, nextKF[i].rot, interpT);
            this.animation.getScene().meshes[0].bones[i].relRot = slerpTI;
        }
        this.animation.getScene().meshes[0].updateAllBones();
    }
    incrementTime(dT) {
        let allRots = [];
        if (this.mode === Mode.playback) {
            //console.log(dT, "INCREMENT");
            this.time += dT;
            if (this.time >= this.getMaxTime()) {
                this.time = 0;
                this.mode = Mode.edit;
            }
            else {
                this.setPose(this.time);
            }
        }
    }
    /**
     * The callback function for a drag event.
     * This event happens after dragStart and
     * before dragEnd.
     * @param mouse
     */
    drag(mouse) {
        this.HasBone = false;
        let x = mouse.offsetX;
        let y = mouse.offsetY;
        if (this.dragging) {
            const dx = mouse.screenX - this.prevX;
            const dy = mouse.screenY - this.prevY;
            this.prevX = mouse.screenX;
            this.prevY = mouse.screenY;
            //console.log(mouse.screenX,mouse.screenY);
            /* Left button, or primary button */
            const mouseDir = this.camera.right();
            mouseDir.scale(-dx);
            mouseDir.add(this.camera.up().scale(dy));
            mouseDir.normalize();
            if (dx === 0 && dy === 0) {
                return;
            }
            let boneNum = this.animation.getScene().meshes[0].boneHighlighted; // I think this gets the bone like i wanted but idk lol
            if (boneNum >= 0) {
                this.HasBone = true;
                let bone = this.animation.getScene().meshes[0].bones[boneNum];
                let newMouseDir = new Vec3([-1 * mouseDir.x, -1 * mouseDir.y, 0]);
                let boneDir = Vec3.difference(bone.endpoint, bone.position); //idk endpoints and pos isnt working here
                let axis = Vec3.cross(boneDir, newMouseDir);
                let myQuat = Quat.fromAxisAngle(axis, GUI.rotationSpeed);
                this.keyFrames[this.numKeyFrames][boneNum].rot.multiply(myQuat);
                //console.log("rotating bone");
                //this.animation.getScene().meshes[0].startTranslation(myQuat, boneNum);
                this.animation.getScene().meshes[0].boneToHighlight = boneNum;
                bone.justRotate(myQuat.copy());
                this.animation.getScene().meshes[0].updateAllBones();
                // rotate bone with quat with params rotationspeed and axis
                //with that done we need to update the current pos of bones, i think it was 'D' or somethning
                //////////////////////////////////////////////           
            }
            else {
                switch (mouse.buttons) {
                    case 1: {
                        let rotAxis = Vec3.cross(this.camera.forward(), mouseDir);
                        rotAxis = rotAxis.normalize();
                        if (this.fps) {
                            this.camera.rotate(rotAxis, GUI.rotationSpeed);
                        }
                        else {
                            this.camera.orbitTarget(rotAxis, GUI.rotationSpeed);
                        }
                        break;
                    }
                    case 2: {
                        /* Right button, or secondary button */
                        this.camera.offsetDist(Math.sign(mouseDir.y) * GUI.zoomSpeed);
                        break;
                    }
                    default: {
                        break;
                    }
                }
            }
        }
        // TODO
        // You will want logic here:
        // 1) To highlight a bone, if the mouse is hovering over a bone; DONE
        // 2) To rotate a bone, if the mouse button is pressed and currently highlighting a bone.
        //x, y are the mouse coords
        let cam = this.camera.pos(); // camera coords
        //console.log(x,y);
        // Convert the position of the mouse cursor in screen coordinates to a ray in world coordinates
        let xCentered = ((2 * x) / this.width) - 1;
        let yCentered = -((2 * y) / this.viewPortHeight) + 1;
        let pointer = new Vec4([xCentered, yCentered, -1, 1]);
        let projInv = this.projMatrix().inverse();
        let viewInv = this.viewMatrix().inverse();
        let pointerW = viewInv.multiplyVec4(projInv.multiplyVec4(pointer));
        pointerW.scale(1 / pointerW.w);
        let rayPoint = new Vec3(pointerW.xyz);
        rayPoint = Vec3.difference(rayPoint, cam);
        rayPoint.normalize();
        //console.log("\n RAY POINT");
        //console.log(rayPoint);
        let bones = this.animation.getScene().meshes[0].bones;
        let highlights = this.animation.getScene().meshes[0].boneHighlighted;
        let currBone = null;
        let boneLen = bones.length;
        let shortDist = 100000;
        let shortInd = -5;
        if (!this.HasBone) {
            for (let i = 0; i < boneLen; i++) {
                currBone = bones[i];
                //console.log(currBone);
                let gotHit = currBone.doesIntersect(cam, rayPoint);
                if (gotHit > 0) {
                    //console.log("\n\n\nHELLLLOOOOOOOOOO INTERSECTIIIOOOOOOOOOOOON\n\n\n");
                    if (gotHit < shortDist) {
                        shortDist = gotHit;
                        shortInd = i;
                    }
                }
            }
            this.animation.getScene().meshes[0].boneHighlighted = shortInd;
        }
        //console.log(bones[0].position)
        //}
    }
    getModeString() {
        switch (this.mode) {
            case Mode.edit: {
                return "edit: " + this.getNumKeyFrames() + " keyframes";
            }
            case Mode.playback: {
                return "playback: " + this.getTime().toFixed(2) + " / " + this.getMaxTime().toFixed(2);
            }
        }
    }
    /**
     * Callback function for the end of a drag event
     * @param mouse
     */
    dragEnd(mouse) {
        this.dragging = false;
        this.prevX = 0;
        this.prevY = 0;
        let curMesh = this.animation.getScene().meshes[0];
        /*if(curMesh.boneToHighlight>=0){
          let Change: boneChange = new boneChange(this.curRotQuat.copy(), curMesh.boneToHighlight);
          this.keyFrames[this.curKeyFrame][curMesh.boneToHighlight]=Change;
          console.log(Change, this.keyFrames[0].length);
          curMesh.boneToHighlight = curMesh.boneHighlighted;
        }*/
        // TODO
        // Maybe your bone highlight/dragging logic needs to do stuff here too
    }
    /**
     * Callback function for a key press event
     * @param key
     */
    onKeydown(key) {
        switch (key.code) {
            case "Digit1": {
                let testMat = new Mat3([0, 1, 0, -1, 0, 0, 0, 0, 1]);
                let testQuat = testMat.toQuat();
                let newTestMat = testQuat.toMat3();
                //console.log(testMat,testQuat,newTestMat);
                this.animation.setScene("/static/assets/skinning/split_cube.dae");
                this.reset();
                break;
            }
            case "Digit2": {
                this.animation.setScene("/static/assets/skinning/long_cubes.dae");
                this.reset();
                break;
            }
            case "Digit3": {
                this.animation.setScene("/static/assets/skinning/simple_art.dae");
                this.reset();
                break;
            }
            case "Digit4": {
                this.animation.setScene("/static/assets/skinning/mapped_cube.dae");
                this.reset();
                break;
            }
            case "Digit5": {
                this.animation.setScene("/static/assets/skinning/robot.dae");
                this.reset();
                break;
            }
            case "Digit6": {
                this.animation.setScene("/static/assets/skinning/head.dae");
                this.reset();
                break;
            }
            case "Digit7": {
                this.animation.setScene("/static/assets/skinning/wolf.dae");
                this.reset();
                break;
            }
            case "Digit8": {
                this.animation.setScene("/static/assets/skinning/green.dae");
                this.reset();
                break;
            }
            case "KeyW": {
                this.camera.offset(this.camera.forward().negate(), GUI.zoomSpeed, true);
                break;
            }
            case "KeyA": {
                this.camera.offset(this.camera.right().negate(), GUI.zoomSpeed, true);
                break;
            }
            case "KeyS": {
                this.camera.offset(this.camera.forward(), GUI.zoomSpeed, true);
                break;
            }
            case "KeyD": {
                this.camera.offset(this.camera.right(), GUI.zoomSpeed, true);
                break;
            }
            case "KeyR": {
                this.animation.reset();
                this.reset();
                break;
            }
            case "ArrowLeft": {
                let BH = this.animation.getScene().meshes[0].boneHighlighted;
                if (BH >= 0) {
                    let bone = this.animation.getScene().meshes[0].bones[BH];
                    let boneDir = Vec3.difference(bone.endpoint, bone.position);
                    let boneDirInit = Vec3.difference(bone.initialEndpoint, bone.initialPosition);
                    let axis = boneDirInit.copy();
                    axis.normalize();
                    let locAxis = bone.rotation.toMat3().multiplyVec3(axis);
                    locAxis.normalize();
                    let myQuat = Quat.fromAxisAngle(locAxis, -GUI.rollSpeed);
                    bone.justRotate(myQuat.copy());
                    this.animation.getScene().meshes[0].updateAllBones();
                }
                else {
                    this.camera.roll(GUI.rollSpeed, false);
                }
                break;
            }
            case "ArrowRight": {
                let BH = this.animation.getScene().meshes[0].boneHighlighted;
                if (BH >= 0) {
                    let bone = this.animation.getScene().meshes[0].bones[BH];
                    let boneDir = Vec3.difference(bone.endpoint, bone.position);
                    let boneDirInit = Vec3.difference(bone.initialEndpoint, bone.initialPosition);
                    let axis = boneDirInit.copy();
                    axis.normalize();
                    let locAxis = bone.rotation.toMat3().multiplyVec3(axis);
                    locAxis.normalize();
                    let myQuat = Quat.fromAxisAngle(locAxis, GUI.rollSpeed);
                    bone.justRotate(myQuat.copy());
                    this.animation.getScene().meshes[0].updateAllBones();
                }
                else {
                    this.camera.roll(GUI.rollSpeed, true);
                }
                break;
            }
            case "ArrowUp": {
                this.camera.offset(this.camera.up(), GUI.zoomSpeed, true);
                break;
            }
            case "ArrowDown": {
                this.camera.offset(this.camera.up().negate(), GUI.zoomSpeed, true);
                break;
            }
            case "KeyK": {
                if (this.mode === Mode.edit) {
                    let myMesh = this.animation.getScene().meshes[0];
                    let newArr = new Array(myMesh.bones.length);
                    for (let i = 0; i < newArr.length; i++) {
                        newArr[i] = new boneChange(myMesh.bones[i].relRot, i);
                    }
                    this.numKeyFrames++;
                    if (this.keyFrames.length < this.numKeyFrames) {
                        this.keyFrames.push(newArr);
                    }
                    else {
                        this.keyFrames[this.numKeyFrames] = newArr;
                    }
                    let c = this.camera;
                    this.animation.setPreviewTexture(0, 200, 800, 600, this.numKeyFrames - 1, c.pos(), c.target(), c.up(), c.fov(), c.aspect(), c.zNear(), c.zFar());
                    // Add keyframe
                }
                break;
            }
            case "KeyP": {
                if (this.mode === Mode.edit && this.getNumKeyFrames() > 1) {
                    this.mode = Mode.playback;
                    this.time = 0;
                    console.log(this.getMaxTime());
                }
                else if (this.mode === Mode.playback) {
                    this.mode = Mode.edit;
                }
                break;
            }
            case "KeyU": {
                if (this.curKeyFrame > -1) {
                    let myMesh = this.animation.getScene().meshes[0];
                    let newArr = new Array(myMesh.bones.length);
                    for (let i = 0; i < newArr.length; i++) {
                        newArr[i] = new boneChange(myMesh.bones[i].relRot, i);
                    }
                    this.keyFrames[this.curKeyFrame] = newArr;
                    let c = this.camera;
                    this.animation.setPreviewTexture(0, 200, 800, 600, this.curKeyFrame, c.pos(), c.target(), c.up(), c.fov(), c.aspect(), c.zNear(), c.zFar());
                }
                break;
            }
            case "Delete": {
                if (this.curKeyFrame > -1) {
                    this.keyFrames.splice(this.curKeyFrame, 1);
                    this.numKeyFrames--;
                    this.animation.previews.splice(this.curKeyFrame, 1);
                    this.animation.setPreviewTextures(0, 200, 800, 600);
                }
                break;
            }
            case "Equal": {
                if (this.curKeyFrame > -1) {
                    this.setPose(this.curKeyFrame);
                }
                break;
            }
            default: {
                console.log("Key : '", key.code, "' was pressed.");
                break;
            }
        }
    }
    /**
     * Registers all event listeners for the GUI
     * @param canvas The canvas being used
     */
    registerEventListeners(canvas) {
        /* Event listener for key controls */
        window.addEventListener("keydown", (key) => this.onKeydown(key));
        /* Event listener for mouse controls */
        canvas.addEventListener("mousedown", (mouse) => this.dragStart(mouse));
        canvas.addEventListener("mousemove", (mouse) => this.drag(mouse));
        canvas.addEventListener("mouseup", (mouse) => this.dragEnd(mouse));
        /* Event listener to stop the right click menu */
        canvas.addEventListener("contextmenu", (event) => event.preventDefault());
    }
}
GUI.rotationSpeed = 0.05;
GUI.zoomSpeed = 0.1;
GUI.rollSpeed = 0.1;
GUI.panSpeed = 0.1;
//# sourceMappingURL=Gui.js.map