import { Mat3, Mat4, Quat, Vec3, Vec4 } from "../lib/TSM.js";
import { AttributeLoader, MeshGeometryLoader, BoneLoader, MeshLoader } from "./AnimationFileLoader.js";

export class Attribute {
  values: Float32Array;
  count: number;
  itemSize: number;

  constructor(attr: AttributeLoader) {
    this.values = attr.values;
    this.count = attr.count;
    this.itemSize = attr.itemSize;
  }
}
export class MeshGeometry {
  position: Attribute;
  normal: Attribute;
  uv: Attribute | null;
  skinIndex: Attribute; // which bones affect each vertex?
  skinWeight: Attribute; // with what weight?
  v0: Attribute; // position of each vertex of the mesh *in the coordinate system of bone skinIndex[0]'s joint*. Perhaps useful for LBS.
  v1: Attribute;
  v2: Attribute;
  v3: Attribute;

  constructor(mesh: MeshGeometryLoader) {
    this.position = new Attribute(mesh.position);
    this.normal = new Attribute(mesh.normal);
    if (mesh.uv) { this.uv = new Attribute(mesh.uv); }
    this.skinIndex = new Attribute(mesh.skinIndex);
    this.skinWeight = new Attribute(mesh.skinWeight);
    this.v0 = new Attribute(mesh.v0);
    this.v1 = new Attribute(mesh.v1);
    this.v2 = new Attribute(mesh.v2);
    this.v3 = new Attribute(mesh.v3);
  }
}

export class Bone {
  public parent: number;
  public children: number[];
  public position: Vec3; // current position of the bone's joint *in world coordinates*. Used by the provided skeleton shader, so you need to keep this up to date.
  public endpoint: Vec3; // current position of the bone's second (non-joint) endpoint, in world coordinates
  public rotation: Quat; // current orientation of the joint *with respect to world coordinates*
  
  public length: number;
  public boneD: Mat4;
  public bMat: Mat4;
  public bVec: Vec3;
  public relRot: Quat;

  public initialPosition: Vec3; // position of the bone's joint *in world coordinates*
  public initialEndpoint: Vec3; // position of the bone's second (non-joint) endpoint, in world coordinates

  public offset: number; // used when parsing the Collada file---you probably don't need to touch these
  public initialTransformation: Mat4;

  public highlighted: boolean;

  constructor(bone: BoneLoader) {
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
    let tempD: number[] = this.boneD.all();
    tempD[12]=this.initialPosition.x;
    tempD[13]=this.initialPosition.y;
    tempD[14]=this.initialPosition.z;
    tempD[15]=1;
    this.boneD = new Mat4(tempD);
    this.bVec = new Vec3();
    this.bMat = new Mat4();
    this.bMat.setIdentity();
    this.length = this.bVec.length();
    this.relRot = new Quat();
    this.relRot.setIdentity();
    //console.log("BoneD: ",this.boneD,"bMat: ",this.bMat,"relRot: ",this.relRot);
  }
  public doesIntersect(rayPos:Vec3, rayDir:Vec3): number {
    let intersected: number = -1;
    let rad: number = 0.1;
    let p1: Vec3 = this.position.copy();
    let p2: Vec3 = this.position.copy();
    let p3: Vec3 = this.endpoint.copy();
    let p4: Vec3 = this.endpoint.copy();
    let boneDir: Vec3 = new Vec3();
    boneDir = Vec3.direction(p3,p1);
    let addDir: Vec3 = new Vec3();
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
    let int1: number = this.TriangleIntersection(rayPos,rayDir,p1,p3,p4);
    let int2: number = this.TriangleIntersection(rayPos,rayDir,p4,p2,p1);
    if(int1>0){
      return int1;
    }
    if(int2>0){
      return int2;
    }
    return -1;
  }
  public TriangleIntersection(rayPos: Vec3, rayDir: Vec3, a: Vec3, b: Vec3, c: Vec3): number{
    let hit: boolean = false;
    let t: number = 0;
    let ba: Vec3 = new Vec3();
    b.subtract(a,ba);
    let ca: Vec3 = new Vec3();
    c.subtract(a,ca);
    let cb: Vec3 = new Vec3();
    c.subtract(b,cb);
    let ac: Vec3 = new Vec3();
    a.subtract(c,ac);
    let N: Vec3 = new Vec3();
    N = Vec3.cross(ba,ca);
    let uN: Vec3 = N;
    N.normalize();
    let dist: number = Vec3.dot(N,a);
    let lenN :number = uN.length();
    let NP: number = Vec3.dot(N,rayPos);
    let ND: number = Vec3.dot(N, rayDir);
    let newD: Vec3 = new Vec3([0,0,0]);
    t = (dist-NP)/ND;
    if(t<0){
      -1;
    }
    let q: Vec3= new Vec3();
    rayPos.add(rayDir.scale(t),q);
    let qa: Vec3= new Vec3();
    q.subtract(a,qa);
    let qb: Vec3= new Vec3();
    q.subtract(b,qb);
    let qc: Vec3= new Vec3();
    q.subtract(c,qc);
    let cbqb: Vec3 = Vec3.cross(cb,qb);
    let acqc: Vec3 = Vec3.cross(ac,qc);
    let cqn: number = Vec3.dot(cbqb,N);
    let aqn: number = Vec3.dot(acqc,N);
    hit = Vec3.dot(Vec3.cross(ba,qa),N)>=0&&cqn>=0&&aqn>=0;    
    if(hit){
      return t;
    }
    return -1;
  }

  public justRotate(rot: Quat){
    this.relRot = Quat.product(this.relRot, rot);
  }

  public updateMatrices(){
    /*D matrix:
    r = rotation;

    [r11 r12 r13 t1]
    [r21 r22 r23 t2]
    [r31 r32 r33 t3]
    [0   0   0    1]
    */
   let myrMat: Mat3 = this.rotation.toMat3();
   let temp: number[] = this.boneD.all();
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
  public updateBoneValues(){
    /*D matrix:
    r = rotation;

    [r11 r12 r13 t1]
    [r21 r22 r23 t2]
    [r31 r32 r33 t3]
    [0    0   0   1]
    */
   let mydMat: Mat3 = this.boneD.copy().toMat3();
   let temp: number[] = this.rotation.toMat3().all();
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
  public geometry: MeshGeometry;
  public worldMatrix: Mat4; // in this project all meshes and rigs have been transformed into world coordinates for you
  public rotation: Vec3;
  public bones: Bone[];
  public materialName: string;
  public imgSrc: String | null;
  

  private boneIndices: number[];
  private bonePositions: Float32Array;
  private boneIndexAttribute: Float32Array;

  public boneHighlighted: number; 
  public boneToHighlight: number;

  constructor(mesh: MeshLoader) {
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
    for(let i = 0; i < this.bones.length;i++){
      this.setB(i);
    }  
  }

  public getBoneIndices(): Uint32Array {
    return new Uint32Array(this.boneIndices);
  }

  public getBonePositions(): Float32Array {
    return this.bonePositions;
  }

  public getBoneIndexAttribute(): Float32Array {
    return this.boneIndexAttribute;
  }

  public getBoneTranslations(): Float32Array {
    let trans = new Float32Array(3 * this.bones.length);
    this.bones.forEach((bone, index) => {
      let res = bone.position.xyz;
      for (let i = 0; i < res.length; i++) {
        trans[3 * index + i] = res[i];
      }
    });
    return trans;
  }

  public getBoneRotations(): Float32Array {
    let trans = new Float32Array(4 * this.bones.length);
    this.bones.forEach((bone, index) => {
      let res = bone.rotation.xyzw;
      for (let i = 0; i < res.length; i++) {
        trans[4 * index + i] = res[i];
      }
    });
    return trans;
  }
  

  public updateAllBones(){
    for(let i = 0; i < this.bones.length;i++){
      let bone: Bone = this.bones[i];
      bone.rotation=this.updateAllRotations(bone);
      let newD: Mat4 = this.updateAllDis(bone,false);
      bone.position = new Vec3(newD.multiplyVec4(new Vec4([0,0,0,1])).xyz);
      let endP : Vec3 = Vec3.difference(bone.initialEndpoint,bone.initialPosition);
      bone.endpoint = new Vec3(newD.multiplyVec4(new Vec4([endP.x,endP.y,endP.z, 1])).xyz);
    }
  }

  public updateAllRotations(bone: Bone){
    if(bone.parent==-1){
      return bone.relRot;
    }
    let pRot: Quat = this.updateAllRotations(this.bones[bone.parent]);
    return Quat.product(pRot, bone.relRot);
  }

  public updateAllDis(bone: Bone, base: boolean){
    let Ti: Mat4;
    let Bi: Mat4 = bone.bMat;
    if(base){
      Ti = Mat4.identity.copy();
    }
    else{
      Ti = bone.relRot.toMat4();
    }
    let prod1: Mat4 = Mat4.product(Bi,Ti);
    if(bone.parent==-1) return prod1;
    let newD: Mat4 = this.updateAllDis(this.bones[bone.parent],base);
    return Mat4.product(newD, prod1);
  }

  public setB(boneInd: number){
    let bone: Bone = this.bones[boneInd];
    let diff: Vec3 = new Vec3();
    let childPos: Vec3 = bone.initialPosition;
    let parPos: Vec3 = new Vec3([0,0,0]);
    if(bone.parent != -1){
      parPos = this.bones[bone.parent].initialPosition;
    }
    diff = Vec3.difference(childPos,parPos);
    this.bones[boneInd].bMat=new Mat4([1,0,0,0,0,1,0,0,0,0,1,0,diff.x,diff.y,diff.z,1]);
  }


  //This is the "root" bone of the translation
  public startTranslation(rotQuat:Quat, boneInd: number){
    this.setB(boneInd);
    let curBone: Bone = this.bones[boneInd];
    //curBone.rotation = Quat.product(curBone.rotation, rMat.toQuat());
    curBone.relRot = Quat.product(curBone.relRot, rotQuat);//correct
    curBone.rotation = Quat.product(curBone.rotation, rotQuat);//correct
    curBone.updateMatrices();//Guaranteed correct
    curBone.endpoint = curBone.boneD.multiplyVec3(curBone.initialEndpoint);//Guaranteed correct
    //console.log("rotations",curBone.relRot, curBone.rotation);
    //console.log("post change");
    //console.log(curBone.rotation.toMat4(),curBone.boneD);
    //console.log(curBone.endpoint);
    if(curBone.children.length>0){
      for(let i = 0; i < curBone.children.length;i++){
        //console.log(boneInd,curBone.children[i]); 
        this.performTranslations(curBone.boneD.copy(), curBone.children[i]);
      }
    } 
  }

  //this is for the recursive one
  public performTranslations(Dj:Mat4, boneInd: number){
    this.setB(boneInd);
    let curBone: Bone = this.bones[boneInd];  
    //console.log("PERFORMING TRANSLATION WOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO");
    //let curTransform: Vec3 = new Vec3([Dj.col(3)[0],Dj.col(3)[1],Dj.col(3)[2]]);
    //let newT: Mat4 = curBone.rotation.toMat4();
    let prodD: Mat4 = new Mat4();
    curBone.bMat.multiply(curBone.relRot.toMat4(),prodD); //Bij is a 4x4 matrix
    Dj.multiply(prodD, curBone.boneD);//relRot is the relative transformation, 4x4 Matrix
    curBone.position = new Vec3(curBone.boneD.multiplyVec4(new Vec4([0,0,0,1])).xyz);
    curBone.endpoint = curBone.boneD.multiplyVec3(curBone.initialEndpoint);
    curBone.updateBoneValues();
    if(curBone.children.length>0){
      for(let i = 0; i < curBone.children.length;i++){
        this.performTranslations(curBone.boneD.copy(), curBone.children[i]);
      }
    }
  }
}