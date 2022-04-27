import { Mat3, Mat4, Quat, Vec3, Vec4 } from "../lib/TSM.js";
export class Attribute {
    constructor(attr) {
        this.values = attr.values;
        this.count = attr.count;
        this.itemSize = attr.itemSize;
    }
}
export class MeshGeometry {
    constructor(mesh) {
        this.position = new Attribute(mesh.position);
        this.normal = new Attribute(mesh.normal);
        if (mesh.uv) {
            this.uv = new Attribute(mesh.uv);
        }
        this.skinIndex = new Attribute(mesh.skinIndex);
        this.skinWeight = new Attribute(mesh.skinWeight);
        this.v0 = new Attribute(mesh.v0);
        this.v1 = new Attribute(mesh.v1);
        this.v2 = new Attribute(mesh.v2);
        this.v3 = new Attribute(mesh.v3);
    }
}
export class Bone {
    constructor(bone) {
        this.parent = bone.parent;
        this.children = Array.from(bone.children);
        this.position = bone.position.copy();
        this.endpoint = bone.endpoint.copy();
        this.rotation = bone.rotation.copy();
        this.offset = bone.offset;
        this.initialPosition = bone.initialPosition.copy();
        this.initialEndpoint = bone.initialEndpoint.copy();
        this.initialTransformation = bone.initialTransformation.copy();
        this.highlighted = false;
        this.boneD = new Mat4();
        this.boneD.setIdentity();
        let tempD = this.boneD.all();
        tempD[12] = this.initialPosition.x;
        tempD[13] = this.initialPosition.y;
        tempD[14] = this.initialPosition.z;
        tempD[15] = 1;
        this.boneD = new Mat4(tempD);
        this.bVec = new Vec3();
        this.bMat = new Mat4();
        this.bMat.setIdentity();
        this.length = this.bVec.length();
        this.relRot = new Quat();
        this.relRot.setIdentity();
        //console.log("BoneD: ",this.boneD,"bMat: ",this.bMat,"relRot: ",this.relRot);
    }
    doesIntersect(rayPos, rayDir) {
        let intersected = -1;
        let rad = 0.1;
        let p1 = this.position.copy();
        let p2 = this.position.copy();
        let p3 = this.endpoint.copy();
        let p4 = this.endpoint.copy();
        let boneDir = new Vec3();
        boneDir = Vec3.direction(p3, p1);
        let addDir = new Vec3();
        addDir = Vec3.cross(boneDir, rayDir);
        addDir.normalize();
        addDir.scale(rad);
        p1.add(addDir);
        p2.subtract(addDir);
        p3.add(addDir);
        p4.subtract(addDir);
        /*console.log(p1);
        console.log(p2);
        console.log(p3);
        console.log(p4);*/
        let int1 = this.TriangleIntersection(rayPos, rayDir, p1, p3, p4);
        let int2 = this.TriangleIntersection(rayPos, rayDir, p4, p2, p1);
        if (int1 > 0) {
            return int1;
        }
        if (int2 > 0) {
            return int2;
        }
        return -1;
    }
    TriangleIntersection(rayPos, rayDir, a, b, c) {
        let hit = false;
        let t = 0;
        let ba = new Vec3();
        b.subtract(a, ba);
        let ca = new Vec3();
        c.subtract(a, ca);
        let cb = new Vec3();
        c.subtract(b, cb);
        let ac = new Vec3();
        a.subtract(c, ac);
        let N = new Vec3();
        N = Vec3.cross(ba, ca);
        let uN = N;
        N.normalize();
        let dist = Vec3.dot(N, a);
        let lenN = uN.length();
        let NP = Vec3.dot(N, rayPos);
        let ND = Vec3.dot(N, rayDir);
        let newD = new Vec3([0, 0, 0]);
        t = (dist - NP) / ND;
        if (t < 0) {
            -1;
        }
        let q = new Vec3();
        rayPos.add(rayDir.scale(t), q);
        let qa = new Vec3();
        q.subtract(a, qa);
        let qb = new Vec3();
        q.subtract(b, qb);
        let qc = new Vec3();
        q.subtract(c, qc);
        let cbqb = Vec3.cross(cb, qb);
        let acqc = Vec3.cross(ac, qc);
        let cqn = Vec3.dot(cbqb, N);
        let aqn = Vec3.dot(acqc, N);
        hit = Vec3.dot(Vec3.cross(ba, qa), N) >= 0 && cqn >= 0 && aqn >= 0;
        if (hit) {
            return t;
        }
        return -1;
    }
    justRotate(rot) {
        this.relRot = Quat.product(this.relRot, rot);
    }
    updateMatrices() {
        /*D matrix:
        r = rotation;
    
        [r11 r12 r13 t1]
        [r21 r22 r23 t2]
        [r31 r32 r33 t3]
        [0   0   0    1]
        */
        let myrMat = this.rotation.toMat3();
        let temp = this.boneD.all();
        temp[0] = myrMat.at(0);
        temp[1] = myrMat.at(1);
        temp[2] = myrMat.at(2);
        temp[4] = myrMat.at(3);
        temp[5] = myrMat.at(4);
        temp[6] = myrMat.at(5);
        temp[8] = myrMat.at(6);
        temp[9] = myrMat.at(7);
        temp[10] = myrMat.at(8);
        this.boneD = new Mat4(temp);
    }
    updateBoneValues() {
        /*D matrix:
        r = rotation;
    
        [r11 r12 r13 t1]
        [r21 r22 r23 t2]
        [r31 r32 r33 t3]
        [0    0   0   1]
        */
        let mydMat = this.boneD.copy().toMat3();
        let temp = this.rotation.toMat3().all();
        temp[0] = mydMat.at(0);
        temp[1] = mydMat.at(1);
        temp[2] = mydMat.at(2);
        temp[3] = mydMat.at(3);
        temp[4] = mydMat.at(4);
        temp[5] = mydMat.at(5);
        temp[6] = mydMat.at(6);
        temp[7] = mydMat.at(7);
        temp[8] = mydMat.at(8);
        this.rotation = new Mat3(temp).toQuat();
    }
}
export class Mesh {
    constructor(mesh) {
        this.geometry = new MeshGeometry(mesh.geometry);
        this.worldMatrix = mesh.worldMatrix.copy();
        this.rotation = mesh.rotation.copy();
        this.bones = [];
        mesh.bones.forEach(bone => {
            this.bones.push(new Bone(bone));
        });
        this.materialName = mesh.materialName;
        this.imgSrc = null;
        this.boneIndices = Array.from(mesh.boneIndices);
        this.bonePositions = new Float32Array(mesh.bonePositions);
        this.boneIndexAttribute = new Float32Array(mesh.boneIndexAttribute);
        this.boneHighlighted = -1;
        this.boneToHighlight = -1;
        for (let i = 0; i < this.bones.length; i++) {
            this.setB(i);
        }
    }
    getBoneIndices() {
        return new Uint32Array(this.boneIndices);
    }
    getBonePositions() {
        return this.bonePositions;
    }
    getBoneIndexAttribute() {
        return this.boneIndexAttribute;
    }
    getBoneTranslations() {
        let trans = new Float32Array(3 * this.bones.length);
        this.bones.forEach((bone, index) => {
            let res = bone.position.xyz;
            for (let i = 0; i < res.length; i++) {
                trans[3 * index + i] = res[i];
            }
        });
        return trans;
    }
    getBoneRotations() {
        let trans = new Float32Array(4 * this.bones.length);
        this.bones.forEach((bone, index) => {
            let res = bone.rotation.xyzw;
            for (let i = 0; i < res.length; i++) {
                trans[4 * index + i] = res[i];
            }
        });
        return trans;
    }
    updateAllBones() {
        for (let i = 0; i < this.bones.length; i++) {
            let bone = this.bones[i];
            bone.rotation = this.updateAllRotations(bone);
            let newD = this.updateAllDis(bone, false);
            bone.position = new Vec3(newD.multiplyVec4(new Vec4([0, 0, 0, 1])).xyz);
            let endP = Vec3.difference(bone.initialEndpoint, bone.initialPosition);
            bone.endpoint = new Vec3(newD.multiplyVec4(new Vec4([endP.x, endP.y, endP.z, 1])).xyz);
        }
    }
    updateAllRotations(bone) {
        if (bone.parent == -1) {
            return bone.relRot;
        }
        let pRot = this.updateAllRotations(this.bones[bone.parent]);
        return Quat.product(pRot, bone.relRot);
    }
    updateAllDis(bone, base) {
        let Ti;
        let Bi = bone.bMat;
        if (base) {
            Ti = Mat4.identity.copy();
        }
        else {
            Ti = bone.relRot.toMat4();
        }
        let prod1 = Mat4.product(Bi, Ti);
        if (bone.parent == -1)
            return prod1;
        let newD = this.updateAllDis(this.bones[bone.parent], base);
        return Mat4.product(newD, prod1);
    }
    setB(boneInd) {
        let bone = this.bones[boneInd];
        let diff = new Vec3();
        let childPos = bone.initialPosition;
        let parPos = new Vec3([0, 0, 0]);
        if (bone.parent != -1) {
            parPos = this.bones[bone.parent].initialPosition;
        }
        diff = Vec3.difference(childPos, parPos);
        this.bones[boneInd].bMat = new Mat4([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, diff.x, diff.y, diff.z, 1]);
    }
    //This is the "root" bone of the translation
    startTranslation(rotQuat, boneInd) {
        this.setB(boneInd);
        let curBone = this.bones[boneInd];
        //curBone.rotation = Quat.product(curBone.rotation, rMat.toQuat());
        curBone.relRot = Quat.product(curBone.relRot, rotQuat); //correct
        curBone.rotation = Quat.product(curBone.rotation, rotQuat); //correct
        curBone.updateMatrices(); //Guaranteed correct
        curBone.endpoint = curBone.boneD.multiplyVec3(curBone.initialEndpoint); //Guaranteed correct
        //console.log("rotations",curBone.relRot, curBone.rotation);
        //console.log("post change");
        //console.log(curBone.rotation.toMat4(),curBone.boneD);
        //console.log(curBone.endpoint);
        if (curBone.children.length > 0) {
            for (let i = 0; i < curBone.children.length; i++) {
                //console.log(boneInd,curBone.children[i]); 
                this.performTranslations(curBone.boneD.copy(), curBone.children[i]);
            }
        }
    }
    //this is for the recursive one
    performTranslations(Dj, boneInd) {
        this.setB(boneInd);
        let curBone = this.bones[boneInd];
        //console.log("PERFORMING TRANSLATION WOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO");
        //let curTransform: Vec3 = new Vec3([Dj.col(3)[0],Dj.col(3)[1],Dj.col(3)[2]]);
        //let newT: Mat4 = curBone.rotation.toMat4();
        let prodD = new Mat4();
        curBone.bMat.multiply(curBone.relRot.toMat4(), prodD); //Bij is a 4x4 matrix
        Dj.multiply(prodD, curBone.boneD); //relRot is the relative transformation, 4x4 Matrix
        curBone.position = new Vec3(curBone.boneD.multiplyVec4(new Vec4([0, 0, 0, 1])).xyz);
        curBone.endpoint = curBone.boneD.multiplyVec3(curBone.initialEndpoint);
        curBone.updateBoneValues();
        if (curBone.children.length > 0) {
            for (let i = 0; i < curBone.children.length; i++) {
                this.performTranslations(curBone.boneD.copy(), curBone.children[i]);
            }
        }
    }
}
//# sourceMappingURL=Scene.js.map