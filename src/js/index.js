const VSHADER_SOURCE =
    `
attribute vec4 a_Position;
uniform mat4 u_MvpMatrix;
attribute vec2 a_TexCoord;
varying highp vec2 v_TexCoord;
void main() {
    gl_Position = u_MvpMatrix * a_Position;
    v_TexCoord = a_TexCoord;
}
`;
const FSHADER_SOURCE =
    `
uniform sampler2D u_Sampler;
varying highp vec2 v_TexCoord;
void main() {
    gl_FragColor = texture2D(u_Sampler,v_TexCoord);
}
`;
class Main {
    constructor(canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl');
        const btn = document.getElementById('vr');
        this.frameData = new VRFrameData();

        navigator.getVRDisplays().then(displays => {
            this.vrDisplay = displays[0];
            console.log('Display found');
            if (!this.vrDisplay) return;
            let flag = true;
            btn.addEventListener('click', e => {
                if (flag) {
                    btn.textContent = '退出VR';
                const leftEye = this.vrDisplay.getEyeParameters('left');
                const rightEye = this.vrDisplay.getEyeParameters('right');

                canvas.width = Math.max(leftEye.renderWidth, rightEye.renderWidth) * 2;
                canvas.height = Math.max(leftEye.renderHeight, rightEye.renderHeight);
                    this.vrDisplay.requestPresent([{
                        source: canvas
                    }]).then(() => {
                        this.start();
                        this.render();
                    });
                } else {
                    btn.textContent = '进入VR';
                    this.vrDisplay.exitPresent();
                    this.vrDisplay.cancelAnimationFrame(this.vrSceneFrame);
                    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
                }
                flag = !flag;
            });
        });
    }
    start() {
        const {
            gl,
            canvas,
            vrDisplay
        } = this;
        // Initialize shaders
        if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
            console.log('Failed to intialize shaders.');
            return;
        }
        this.n = this.initVertexBuffers(gl);
        this.initTextures(gl,'../assets/texture.jpg');
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0); 
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);    

    }
    render() {
        const {
            gl,
            canvas,
            vrDisplay,
            frameData,
            n
        } = this;

        let modelMatrix = mat4.create(),
            vpMatrix = mat4.create(),
            mvpMatrix = mat4.create();
        mat4.translate(modelMatrix, modelMatrix, [-3, -3, -7]);

        const u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
        let angle = 0.0;
        this.frameId;
        const animate = () => {
            this.vrSceneFrame = vrDisplay.requestAnimationFrame(animate);
            vrDisplay.getFrameData(frameData);
            mat4.rotate(modelMatrix, modelMatrix, 0.02, [0, 1, 0]);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


            gl.bindTexture(gl.TEXTURE_2D,this.texture);
            const u_Sampler = gl.getUniformLocation(gl.program, 'u_Sampler');
            gl.uniform1i(u_Sampler,0);

            //left
            mat4.multiply(vpMatrix, frameData.leftProjectionMatrix, frameData.leftViewMatrix);
            mat4.multiply(mvpMatrix, vpMatrix, modelMatrix);

            gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix);

            gl.viewport(0, 0, canvas.width * 0.5, canvas.height);
            gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_SHORT, 0);

            //right
            mat4.multiply(vpMatrix, frameData.rightProjectionMatrix, frameData.rightViewMatrix);
            mat4.multiply(mvpMatrix, vpMatrix, modelMatrix);

            gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix);

            gl.viewport(canvas.width * 0.5, 0, canvas.width * 0.5, canvas.height);
            gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_SHORT, 0);
            this.vrDisplay.submitFrame();

        }
        animate();

    }
    initVertexBuffers(gl) {
        // 创建立方体
        //    *-------*
        //   /|      /|
        //  *-------* |
        //  | |     | |
        //  | |*----|-*
        //  |/      |/
        //  *-------*

        const initVertexBuffer = (gl, attribName, bufferData,length) => {
            const buffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.bufferData(gl.ARRAY_BUFFER, bufferData, gl.STATIC_DRAW);
            const attribLocation = gl.getAttribLocation(gl.program, attribName);
            gl.vertexAttribPointer(attribLocation, length, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(attribLocation);
        }
        const vertices = new Float32Array([
            // Front face
            -1.0, -1.0, 1.0,
            1.0, -1.0, 1.0,
            1.0, 1.0, 1.0,
            -1.0, 1.0, 1.0,

            // Back face
            -1.0, -1.0, -1.0,
            -1.0, 1.0, -1.0,
            1.0, 1.0, -1.0,
            1.0, -1.0, -1.0,

            // Top face
            -1.0, 1.0, -1.0,
            -1.0, 1.0, 1.0,
            1.0, 1.0, 1.0,
            1.0, 1.0, -1.0,

            // Bottom face
            -1.0, -1.0, -1.0,
            1.0, -1.0, -1.0,
            1.0, -1.0, 1.0,
            -1.0, -1.0, 1.0,

            // Right face
            1.0, -1.0, -1.0,
            1.0, 1.0, -1.0,
            1.0, 1.0, 1.0,
            1.0, -1.0, 1.0,

            // Left face
            -1.0, -1.0, -1.0,
            -1.0, -1.0, 1.0,
            -1.0, 1.0, 1.0,
            -1.0, 1.0, -1.0
        ]);

        // Colors
        const textureCoordinates = new Float32Array([
            // Front
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,
            // Back
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,
            // Top
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,
            // Bottom
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,
            // Right
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,
            // Left
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0
        ]);

        const indices = new Uint16Array([
            0, 1, 2, 0, 2, 3, // front
            4, 5, 6, 4, 6, 7, // back
            8, 9, 10, 8, 10, 11, // top
            12, 13, 14, 12, 14, 15, // bottom
            16, 17, 18, 16, 18, 19, // right
            20, 21, 22, 20, 22, 23 // left
        ]);

        // const vertexColorBuffer = gl.createBuffer();
        initVertexBuffer(gl, 'a_Position', vertices,3);
        initVertexBuffer(gl, 'a_TexCoord', textureCoordinates,2);

        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

        return indices.length;
    }
    initTextures(gl,source) {
        this.texture = gl.createTexture();
        const image = new Image();
        image.onload = () => {
            loadTexture(gl,this.texture,image);
        }
        image.src = source;
        const loadTexture = (gl,texture,image) => {
        gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D,texture);
            gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
// gl.NEAREST is also allowed, instead of gl.LINEAR, as neither mipmap.
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
// Prevents s-coordinate wrapping (repeating).
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
// Prevents t-coordinate wrapping (repeating).
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }
    }
}