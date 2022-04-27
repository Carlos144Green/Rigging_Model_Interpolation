import { Mat4, Vec3, Vec4 } from "../TSM.js";
export class Floor {
    constructor() {
        this.floorY = -2;
        /* Set default position. */
        this.vertices = [
            new Vec4([0, this.floorY, 0, 1]),
            new Vec4([1, 0, 0, 0]),
            new Vec4([0, 0, 1, 0]),
            new Vec4([-1, 0, 0, 0]),
            new Vec4([0, 0, -1, 0])
        ];
        console.assert(this.vertices != null);
        console.assert(this.vertices.length === 5);
        /* Flatten Position. */
        this.verticesF32 = new Float32Array(this.vertices.length * 4);
        this.vertices.forEach((v, i) => { this.verticesF32.set(v.xyzw, i * 4); });
        console.assert(this.verticesF32 != null);
        console.assert(this.verticesF32.length === 5 * 4);
        /* Set indices. */
        this.ind = [
            new Vec3([0, 2, 1]),
            new Vec3([0, 3, 2]),
            new Vec3([0, 4, 3]),
            new Vec3([0, 1, 4])
        ];
        console.assert(this.ind != null);
        console.assert(this.ind.length === 4);
        /* Flatten Indices. */
        this.indicesU32 = new Uint32Array(this.ind.length * 3);
        this.ind.forEach((v, i) => { this.indicesU32.set(v.xyz, i * 3); });
        console.assert(this.indicesU32 != null);
        console.assert(this.indicesU32.length === 4 * 3);
        /* Set Normals. */
        this.norms = [
            new Vec4([0.0, 1.0, 0.0, 0.0]),
            new Vec4([0.0, 1.0, 0.0, 0.0]),
            new Vec4([0.0, 1.0, 0.0, 0.0]),
            new Vec4([0.0, 1.0, 0.0, 0.0])
        ];
        this.normalsF32 = new Float32Array(this.norms.length * 4);
        this.norms.forEach((v, i) => { this.normalsF32.set(v.xyzw, i * 4); });
    }
    positions() {
        console.assert(this.vertices.length === 5);
        return this.vertices;
    }
    positionsFlat() {
        console.assert(this.verticesF32.length === 5 * 4);
        return this.verticesF32;
    }
    colors() {
        throw new Error("Floor::colors() incomplete method");
        return [];
    }
    colorsFlat() {
        throw new Error("Floor::colorsFlat() incomplete method");
        return new Float32Array([]);
    }
    setColors(colors) {
        throw new Error("Floor::setColors() incomplete method");
    }
    indices() {
        console.assert(this.ind.length === 4);
        return this.ind;
    }
    indicesFlat() {
        console.assert(this.indicesU32.length === 4 * 3);
        return this.indicesU32;
    }
    uMatrix() {
        throw new Error("Floor::uMatrix() incomplete method");
        return new Mat4();
    }
    scale(s) {
        throw new Error("Floor::scale() incomplete method");
    }
    translate(p) {
        throw new Error("Floor::translate() incomplete method");
    }
    normals() {
        return this.norms;
    }
    normalsFlat() {
        return this.normalsF32;
    }
}
//# sourceMappingURL=Floor.js.map