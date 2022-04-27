import { WebGLUtilities } from "./CanvasAnimation.js";

export class RenderPass {
  private ctx: WebGLRenderingContext;
  private extVAO: OES_vertex_array_object;

  /* Shader information */
  private vShader: string;
  private fShader: string;
  private shaderProgram: WebGLProgram;

  /* Attributes and indices */
  private VAO: WebGLVertexArrayObjectOES;
  private indexBuffer: WebGLBuffer;
  private indexBufferData: Uint32Array;
  private attributeBuffers: Map<string, AttributeBuffer>;
  private attributes: Attribute[];

  private uniforms: Map<string, Uniform>;

  private drawMode: GLenum;
  private drawCount: number;
  private drawType: GLenum;
  private drawOffset: number;

  private textureMap: String;
  private textureMapped: boolean;
  private textureLoaded: boolean;
  public texture: WebGLTexture;

  constructor(extVAO: OES_vertex_array_object, context: WebGLRenderingContext, vShader: string, fShader: string) {
    this.extVAO = extVAO;
    this.ctx = context;
    this.vShader = vShader.slice();
    this.fShader = fShader.slice();
    this.shaderProgram = 0;

    this.VAO = 0;
    this.indexBuffer = 0;
    this.indexBufferData = new Uint32Array(0);
    this.attributeBuffers = new Map();
    this.attributes = [];

    this.uniforms = new Map();

    this.drawMode = 0;
    this.drawCount = 0;
    this.drawType = 0;
    this.drawOffset = 0;

    this.textureMapped = false;
    this.textureLoaded = false;
    this.textureMap = "";
    this.texture = 0;
  }

  public setup() {
    const gl: WebGLRenderingContext = this.ctx;
    this.shaderProgram = WebGLUtilities.createProgram(gl, this.vShader, this.fShader);
    gl.useProgram(this.shaderProgram);

    /* Setup VAO */
    this.VAO = this.extVAO.createVertexArrayOES() as WebGLVertexArrayObjectOES;
    this.extVAO.bindVertexArrayOES(this.VAO);

    /* Setup Index Buffer */
    this.indexBuffer = gl.createBuffer() as WebGLBuffer;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      this.indexBufferData,
      gl.STATIC_DRAW
    );

    /* Setup Attributes */
    this.attributes.forEach((attr) => {
      let attrLoc = gl.getAttribLocation(this.shaderProgram, attr.name);
      let attrBuffer = this.attributeBuffers.get(attr.bufferName);
      if (attrBuffer) {
        attrBuffer.bufferId = gl.createBuffer() as WebGLBuffer;
        gl.bindBuffer(gl.ARRAY_BUFFER, attrBuffer.bufferId);
        gl.bufferData(gl.ARRAY_BUFFER, attrBuffer.data, gl.STATIC_DRAW);
        gl.vertexAttribPointer(
          attrLoc,
          attr.size,
          attr.type,
          attr.normalized,
          attr.stride,
          attr.offset
        )
        gl.enableVertexAttribArray(attrLoc);
      } else {
        console.error("Attribute's buffer name not found", this);
      }
    });


    /* Setup Uniforms */
    for (let [key, value] of this.uniforms) {
      value.location = gl.getUniformLocation(this.shaderProgram, key) as WebGLUniformLocation;
    }

    /* Setup Maps */
    if (this.textureMapped) {
      if (!this.textureLoaded) {
        let createTextureResult = gl.createTexture();
        if (createTextureResult === null) {
          console.error("Error creating texture");
        } else {
          this.texture = createTextureResult;
        }
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255])); // Temporary color
        let img = new Image();
        img.onload = (ev: Event) => {
          console.log("Loaded texturemap: " + this.textureMap);
          gl.useProgram(this.shaderProgram);
          this.extVAO.bindVertexArrayOES(this.VAO);
          gl.bindTexture(gl.TEXTURE_2D, this.texture);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.useProgram(null);
          this.extVAO.bindVertexArrayOES(null);
        }
        img.src = "/static/assets/skinning/" + this.textureMap;
      }
    }

    gl.useProgram(null);
    this.extVAO.bindVertexArrayOES(null);
  }


  public draw() {
    let gl = this.ctx;
    gl.useProgram(this.shaderProgram);
    this.extVAO.bindVertexArrayOES(this.VAO);

    this.uniforms.forEach(uniform => {
      uniform.bindFunction(gl, uniform.location);
    });
    if (this.textureMapped) {
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
    }
    gl.drawElements(this.drawMode, this.drawCount, this.drawType, this.drawOffset);

    gl.useProgram(null);
    this.extVAO.bindVertexArrayOES(null);
  }

  public setDrawData(drawMode: GLenum, drawCount: number, drawType: GLenum, drawOffset: number) {
    this.drawMode = drawMode;
    this.drawCount = drawCount;
    this.drawType = drawType;
    this.drawOffset = drawOffset;
  }

  public addUniform(name: string,
                    bindFunction: (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => void) {
    this.uniforms.set(name, new Uniform(0, bindFunction));
  }

  public setIndexBufferData(data: Uint32Array) {
    this.indexBufferData = data;
  }

  public addAttribute(attribName: string, size: number, type: GLenum, normalized: boolean,
                      stride: number, offset: number, bufferName?: string, bufferData?: BufferData) {

    if (!bufferName) {
      bufferName = attribName;
      if (!bufferData) {
        console.error("Impossible to determine data for buffer");
      } else {
        this.attributeBuffers.set(bufferName, new AttributeBuffer(0, bufferData));
      }
    } else {
      if (!this.attributeBuffers.has(bufferName)) {
        if (!bufferData) {
          console.error("Impossible to determine data for buffer");
        } else {
          this.attributeBuffers.set(bufferName, new AttributeBuffer(0, bufferData));
        }
      }
    }

    this.attributes.push(new Attribute(attribName, size, type, normalized, stride, offset, bufferName));
  }

  public addTextureMap(texture: String, vShader?: string, fShader?: string) {
    if (vShader) { this.vShader = vShader; }
    if (fShader) { this.fShader = fShader; }
    this.textureMapped = true;
    this.textureMap = texture;
  }

  public addTexture(tex: WebGLTexture) {
    this.textureMapped = true;
    this.textureLoaded = true;
    this.texture = tex;
  }

  public setVertexShader(vShader: string) { this.vShader = vShader; }
  public setFragmentShader(fShader: string) { this.fShader = fShader; }
  public setShaders(vShader: string, fShader: string) { this.vShader = vShader; this.fShader = fShader; }

}

class Uniform {
  public location: WebGLUniformLocation;
  public bindFunction: (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => void;

  constructor(location: WebGLUniformLocation,
              bindFunction: (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => void) {
    this.location = location;
    this.bindFunction = bindFunction;
  }
}

class Attribute {
  public name: string;
  public size: number;
  public type: GLenum;
  public normalized: boolean;
  public stride: number;
  public offset: number;
  public bufferName: string;

  constructor(name: string, size: number, type: GLenum, normalized: boolean, stride: number,
              offset: number, bufferName: string) {
    this.name = name;
    this.size = size;
    this.type = type;
    this.normalized = normalized;
    this.stride = stride;
    this.offset = offset;
    this.bufferName = bufferName;
  }
}

class AttributeBuffer {
  public bufferId: WebGLBuffer;
  public data: BufferData;

  constructor(bufferId: WebGLBuffer, data: BufferData) {
    this.bufferId = bufferId;
    this.data = data;
  }
}

type BufferData = Uint32Array | Float32Array | Int32Array;