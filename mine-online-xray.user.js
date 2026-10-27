// ==UserScript==
// @name         Mine Online X-Ray (Yandex)
// @namespace    linx
// @version      0.5
// @description  WebGL shader hook + toggle for Майн - Онлайн (Yandex Games)
// @author       linx
// @match        *://yandex.ru/games/*
// @match        *://*.yandex.ru/games/*
// @match        *://app-*.games.s3.yandex.net/*
// @match        *://*.yandex.net/*
// @match        *://*/*
// @run-at       document-start
// @grant        none
// @allFrames    true
// ==/UserScript==

(function () {
    'use strict';

    if (window.__xrayLoaded) return;
    window.__xrayLoaded = true;

    let xrayOn = false;

    function makeUI() {
        if (document.getElementById('linx-xray-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'linx-xray-btn';
        btn.textContent = 'X-RAY: OFF';
        Object.assign(btn.style, {
            position: 'fixed',
            top: '14px',
            right: '14px',
            zIndex: '2147483647',
            padding: '10px 16px',
            background: '#111',
            color: '#0f0',
            border: '2px solid #0f0',
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 0 14px #0f05',
            pointerEvents: 'auto'
        });

        btn.onclick = () => {
            xrayOn = !xrayOn;
            btn.textContent = 'X-RAY: ' + (xrayOn ? 'ON' : 'OFF');
            btn.style.color = xrayOn ? '#f00' : '#0f0';
            btn.style.borderColor = xrayOn ? '#f00' : '#0f0';
            console.log('[XRAY]', xrayOn ? 'ENABLED' : 'DISABLED');
        };

        (document.body || document.documentElement).appendChild(btn);
        console.log('[XRAY] button added');
    }

    function hookWebGL(proto) {
        if (!proto || proto.__xrayHooked) return;
        proto.__xrayHooked = true;

        const origShaderSource = proto.shaderSource;
        if (origShaderSource) {
            proto.shaderSource = function (shader, source) {
                if (typeof source === 'string' && source.length > 50) {
                    if (/MainTex|Block|Terrain|Diffuse|Albedo|_Color|unity|frag|vert/i.test(source)) {
                        console.log('%c[XRAY SHADER]', 'color:#0ff', source.substring(0, 280));
                    }
                    if (xrayOn) {
                        let s = source;
                        if (s.includes('gl_Position')) {
                            s = s.replace(/gl_Position\s*=\s*([^;]+);/, 'gl_Position=$1; gl_Position.z*=0.12;');
                        }
                        if (s.includes('gl_FragColor')) {
                            s = s.replace(/gl_FragColor\s*=\s*([^;]+);/, 'gl_FragColor=$1; gl_FragColor.a*=0.15;');
                        }
                        if (s.includes('SV_Target0')) {
                            s = s.replace(/SV_Target0\s*=\s*([^;]+);/, 'SV_Target0=$1; SV_Target0.a*=0.15;');
                        }
                        source = s;
                    }
                }
                return origShaderSource.call(this, shader, source);
            };
        }

        const origEnable = proto.enable;
        if (origEnable) {
            proto.enable = function (cap) {
                if (xrayOn && (cap === 0x0B71 || cap === this.DEPTH_TEST)) return;
                return origEnable.apply(this, arguments);
            };
        }

        const origDepthMask = proto.depthMask;
        if (origDepthMask) {
            proto.depthMask = function (flag) {
                if (xrayOn) return origDepthMask.call(this, false);
                return origDepthMask.call(this, flag);
            };
        }
    }

    const oldGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, attrs) {
        const ctx = oldGetContext.call(this, type, attrs);
        if (ctx && /webgl/i.test(String(type))) {
            hookWebGL(Object.getPrototypeOf(ctx));
            if (window.WebGLRenderingContext) hookWebGL(WebGLRenderingContext.prototype);
            if (window.WebGL2RenderingContext) hookWebGL(WebGL2RenderingContext.prototype);
        }
        return ctx;
    };

    if (window.WebGLRenderingContext) hookWebGL(WebGLRenderingContext.prototype);
    if (window.WebGL2RenderingContext) hookWebGL(WebGL2RenderingContext.prototype);

    function tryUI() { try { makeUI(); } catch (e) {} }

    if (document.body) tryUI();
    else document.addEventListener('DOMContentLoaded', tryUI);
    setInterval(tryUI, 1500);

    console.log('%c[XRAY] v0.5 loaded', 'color:#0f0;font-weight:bold');
})();
