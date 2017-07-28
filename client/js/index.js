const VSHADER_SOURCE =
    `
attribute vec4 a_Position;
attribute vec4 a_Color;
attribute vec4 a_Normal;
uniform mat4 u_MvpMatrix;
uniform mat4 u_NormalMatrix;
uniform vec3 u_LightColor;
uniform vec3 u_AmbientLight;
uniform vec3 u_LightDirection;
varying vec4 v_Color;
void main() {
    vec3 normal = normalize((u_NormalMatrix * a_Normal).xyz);
    float nDotL = max(dot(u_LightDirection,normal),0.0);
    vec3 ambient = a_Color.rgb * u_AmbientLight;
    vec3 diffuse = a_Color.rgb * u_LightColor * nDotL;
    gl_Position = u_MvpMatrix * a_Position;
    v_Color = vec4(diffuse + ambient,a_Color.a);
}
`;
const FSHADER_SOURCE =
    `
#ifdef GL_ES
precision mediump float;
#endif
varying vec4 v_Color;
void main() {
    gl_FragColor = v_Color;
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
            // Starting the presentation when the button is clicked: It can only be called in response to a user gesture
            btn.addEventListener('click', e => {
                this.vrDisplay.requestPresent([{
                    source: canvas
                }]).then( () => {
                    this.start();
                    this.render();
                });
            });
        });
    }
    start() {
        const {gl,canvas,vrDisplay} = this;
        // Initialize shaders
        if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
            console.log('Failed to intialize shaders.');
            return;
        }
        this.n = this.initVertexBuffers(gl);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.enable(gl.DEPTH_TEST);

        const u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor');
        gl.uniform3f(u_LightColor, 1.0, 1.0, 1.0);

        const u_AmbientLight = gl.getUniformLocation(gl.program, 'u_AmbientLight');
        gl.uniform3f(u_AmbientLight, 0.2, 0.2, 0.2);

        const u_LightDirection = gl.getUniformLocation(gl.program, 'u_LightDirection');
        const lightDirection = new Vector3([0.5, 3.0, 4.0]).normalize();
        gl.uniform3fv(u_LightDirection, lightDirection.elements);

    }
    render() {
        const {gl,canvas,vrDisplay,frameData,n} = this;
        // const vpMatrix = new Matrix4();
        // vpMatrix.setPerspective(30, canvas.width / canvas.height, 1, 100);
        // vpMatrix.lookAt(3, 3, 7, 0, 0, 0, 0, 1, 0);

        const modelMatrix = new Matrix4();
        modelMatrix.setTranslate(-3,-3,-7);
        const mvpMatrix = new Matrix4();
        const normalMatrix = new Matrix4();

        const u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
        const u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
        let angle = 0.0;
        const startTime = Date.now();
        const tick = () => {
            vrDisplay.getFrameData(frameData);
            modelMatrix.rotate(1, 0, 1, 0);

            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
debugger
//left
            mvpMatrix.setArray(frameData.leftProjectionMatrix).multiply(new Matrix4().setArray(frameData.leftViewMatrix)).multiply(modelMatrix);

            normalMatrix.setInverseOf(modelMatrix);
            normalMatrix.transpose();

            gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
            gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);

            gl.viewport(0, 0, canvas.width * 0.5, canvas.height);
            gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);

//right
            mvpMatrix.setArray(frameData.rightProjectionMatrix).multiply(new Matrix4().setArray(frameData.rightViewMatrix)).multiply(modelMatrix);

            normalMatrix.setInverseOf(modelMatrix);
            normalMatrix.transpose();

            gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
            gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);

            gl.viewport(canvas.width * 0.5, 0, canvas.width * 0.5, canvas.height);
            gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);


            vrDisplay.requestAnimationFrame(tick);

        }
        tick();

    }
    animate(startTime, currentTime) {
        return (currentTime - startTime) / 10 % 360;
    }
    initVertexBuffers(gl) {
        // Create a cube
        //    v6----- v5
        //   /|      /|
        //  v1------v0|
        //  | |     | |
        //  | |v7---|-|v4
        //  |/      |/
        //  v2------v3

        const initVertexBuffer = (gl, attribName, bufferData) => {
            const buffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.bufferData(gl.ARRAY_BUFFER, bufferData, gl.STATIC_DRAW);
            const attribLocation = gl.getAttribLocation(gl.program, attribName);
            gl.vertexAttribPointer(attribLocation, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(attribLocation);
        }
        const vertices = new Float32Array([ // Vertex coordinates
            1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, // v0-v1-v2-v3 front
            1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, -1.0, // v0-v3-v4-v5 right
            1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, // v0-v5-v6-v1 up
            -1.0, 1.0, 1.0, -1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, // v1-v6-v7-v2 left
            -1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, -1.0, -1.0, 1.0, // v7-v4-v3-v2 down
            1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0 // v4-v7-v6-v5 back
        ]);

        // Colors
        var colors = new Float32Array([
            0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, // v0-v1-v2-v3 front
            0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, // v0-v3-v4-v5 right
            0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, // v0-v5-v6-v1 up
            0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, // v1-v6-v7-v2 left
            0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, // v7-v4-v3-v2 down
            0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9　 // v4-v7-v6-v5 back
        ]);

        const indices = new Uint8Array([ // Indices of the vertices
            0, 1, 2, 0, 2, 3, // front
            4, 5, 6, 4, 6, 7, // right
            8, 9, 10, 8, 10, 11, // up
            12, 13, 14, 12, 14, 15, // left
            16, 17, 18, 16, 18, 19, // down
            20, 21, 22, 20, 22, 23 // back
        ]);
        // Normal
        const normals = new Float32Array([
            0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, // v0-v1-v2-v3 front
            1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, // v0-v3-v4-v5 right
            0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, // v0-v5-v6-v1 up
            -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, // v1-v6-v7-v2 left
            0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, // v7-v4-v3-v2 down
            0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0 // v4-v7-v6-v5 back
        ]);

        // const vertexColorBuffer = gl.createBuffer();
        initVertexBuffer(gl, 'a_Position', vertices);
        initVertexBuffer(gl, 'a_Color', colors);
        initVertexBuffer(gl, 'a_Normal', normals);


        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

        return indices.length;
    }
}