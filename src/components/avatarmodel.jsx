import React, { useRef, useEffect, useState , useMemo } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';



const visemeToMouthMovement = {
  // Ⓐ Closed lips for “P”, “B”, “M”  
  viseme_PP:   'mouthPress_L',    
  // Ⓑ Slightly open + clenched teeth for “K”, “S”, “T”, “EE”  
  viseme_kk:   'mouthStretch_L',  
  // Ⓒ Moderately open for “EH”/“AE” (in-between Ⓐ/Ⓑ → Ⓓ)  
  viseme_I:    'jawOpen',         
  // Ⓓ Wide open for “AA” as in “father”  
  viseme_AA:   'jawOpen',         
  // Ⓔ Slightly rounded for “AO”/“ER” (in-between Ⓒ/Ⓓ → Ⓕ)  
  viseme_O:    'mouthFunnel',     
  // Ⓕ Puckered lips for “UW”, “OW”, “W”  
  viseme_U:    'mouthPucker',     
  // Ⓖ Top teeth on bottom lip for “F”/“V”  
  viseme_FF:   'mouthPress_L',    
  // Ⓗ Long “L”: tongue up behind teeth, open between Ⓒ & Ⓓ  
  viseme_TH:   'mouthStretch_L',  
  // Ⓧ Idle/rest: closed but relaxed  
  viseme_X:    'mouthPress_R',    
};


const phonemeToViseme = {
  A: "viseme_PP",
  B: "viseme_kk",
  C: "viseme_I",
  D: "viseme_AA",
  E: "viseme_O",
  F: "viseme_U",
  G: "viseme_FF",
  H: "viseme_TH",
  X: "viseme_PP",
};


// // Phoneme sequence with timing
// const phonemeSequence = [
//   // { phoneme: 'HH', start: 0.0, end: 0.1 },
//   { "start": 0.00, "end": 0.05, "phoneme": "X" },
//   { "start": 0.05, "end": 0.27, "phoneme": "D" },
//   { "start": 0.27, "end": 0.41, "phoneme": "B" },
//   { "start": 0.41, "end": 0.49, "phoneme": "A" },
//   { "start": 0.49, "end": 0.59, "phoneme": "F" },
//   { "start": 0.59, "end": 0.66, "phoneme": "B" },
//   { "start": 0.66, "end": 0.73, "phoneme": "F" },
//   { "start": 0.73, "end": 0.80, "phoneme": "D" },
//   { "start": 0.80, "end": 0.94, "phoneme": "B" },
//   { "start": 0.94, "end": 1.01, "phoneme": "C" },
//   { "start": 1.01, "end": 1.15, "phoneme": "B" },
//   { "start": 1.15, "end": 1.29, "phoneme": "C" },
//   { "start": 1.29, "end": 1.40, "phoneme": "B" },
//   { "start": 1.40, "end": 1.47, "phoneme": "F" },
//   { "start": 1.47, "end": 1.54, "phoneme": "C" },
//   { "start": 1.54, "end": 1.61, "phoneme": "B" },
//   { "start": 1.61, "end": 1.68, "phoneme": "A" },
//   { "start": 1.68, "end": 1.79, "phoneme": "F" },
//   { "start": 1.79, "end": 1.87, "phoneme": "A" },
//   { "start": 1.87, "end": 1.93, "phoneme": "C" },
//   { "start": 1.93, "end": 2.27, "phoneme": "F" },
//   { "start": 2.27, "end": 2.37, "phoneme": "A" },
//   { "start": 2.37, "end": 2.44, "phoneme": "B" },
//   { "start": 2.44, "end": 2.58, "phoneme": "C" },
//   { "start": 2.58, "end": 2.84, "phoneme": "B" },
//   { "start": 2.84, "end": 2.90, "phoneme": "H" },
//   { "start": 2.90, "end": 3.10, "phoneme": "B" },
//   { "start": 3.10, "end": 3.24, "phoneme": "E" },
//   { "start": 3.24, "end": 3.38, "phoneme": "C" },
//   { "start": 3.38, "end": 3.52, "phoneme": "F" },
//   { "start": 3.52, "end": 3.59, "phoneme": "C" },
//   { "start": 3.59, "end": 3.80, "phoneme": "B" },
//   { "start": 3.80, "end": 3.88, "phoneme": "A" },
//   { "start": 3.88, "end": 4.10, "phoneme": "B" },
//   { "start": 4.10, "end": 4.38, "phoneme": "F" },
//   { "start": 4.38, "end": 4.45, "phoneme": "D" },
//   { "start": 4.45, "end": 4.66, "phoneme": "B" },
//   { "start": 4.66, "end": 4.73, "phoneme": "C" },
//   { "start": 4.73, "end": 5.08, "phoneme": "B" },
//   { "start": 5.08, "end": 5.15, "phoneme": "G" },
//   { "start": 5.15, "end": 5.22, "phoneme": "C" },
//   { "start": 5.22, "end": 5.30, "phoneme": "A" },
//   { "start": 5.30, "end": 5.41, "phoneme": "E" },
//   { "start": 5.41, "end": 5.50, "phoneme": "A" },
//   { "start": 5.50, "end": 5.56, "phoneme": "B" },
//   { "start": 5.56, "end": 5.69, "phoneme": "D" },
//   { "start": 5.69, "end": 5.76, "phoneme": "B" },
//   { "start": 5.76, "end": 5.83, "phoneme": "C" },
//   { "start": 5.83, "end": 6.11, "phoneme": "B" },
//   { "start": 6.11, "end": 6.21, "phoneme": "X" }
// ];

const phonemeSequence = [
  { "start": 0.00, "end": 0.18, "value": "X" },
  { "start": 0.18, "end": 0.35, "value": "D" },
  { "start": 0.35, "end": 0.39, "value": "C" },
  { "start": 0.39, "end": 0.73, "value": "B" },
  { "start": 0.73, "end": 0.80, "value": "C" },
  { "start": 0.80, "end": 0.86, "value": "B" },
  { "start": 0.86, "end": 0.94, "value": "A" },
  { "start": 0.94, "end": 1.01, "value": "B" },
  { "start": 1.01, "end": 1.07, "value": "C" },
  { "start": 1.07, "end": 1.28, "value": "B" },
  { "start": 1.28, "end": 1.35, "value": "F" },
  { "start": 1.35, "end": 1.43, "value": "A" },
  { "start": 1.43, "end": 1.59, "value": "E" },
  { "start": 1.59, "end": 1.73, "value": "B" },
  { "start": 1.73, "end": 1.80, "value": "C" },
  { "start": 1.80, "end": 1.88, "value": "A" },
  { "start": 1.88, "end": 2.01, "value": "B" },
  { "start": 2.01, "end": 2.15, "value": "C" },
  { "start": 2.15, "end": 2.22, "value": "B" },
  { "start": 2.22, "end": 2.36, "value": "C" },
  { "start": 2.36, "end": 2.43, "value": "B" },
  { "start": 2.43, "end": 2.50, "value": "C" },
  { "start": 2.50, "end": 2.85, "value": "B" },
  { "start": 2.85, "end": 3.06, "value": "C" },
  { "start": 3.06, "end": 3.20, "value": "B" },
  { "start": 3.20, "end": 4.17, "value": "X" },
  { "start": 4.17, "end": 4.50, "value": "C" },
  { "start": 4.50, "end": 4.58, "value": "A" },
  { "start": 4.58, "end": 4.79, "value": "F" },
  { "start": 4.79, "end": 4.84, "value": "E" },
  { "start": 4.84, "end": 5.16, "value": "C" },
  { "start": 5.16, "end": 5.23, "value": "H" },
  { "start": 5.23, "end": 5.30, "value": "C" },
  { "start": 5.30, "end": 5.44, "value": "B" },
  { "start": 5.44, "end": 5.58, "value": "F" },
  { "start": 5.58, "end": 5.72, "value": "B" },
  { "start": 5.72, "end": 5.93, "value": "E" },
  { "start": 5.93, "end": 6.07, "value": "B" },
  { "start": 6.07, "end": 6.21, "value": "C" },
  { "start": 6.21, "end": 6.28, "value": "B" },
  { "start": 6.28, "end": 6.45, "value": "C" },
  { "start": 6.45, "end": 6.50, "value": "G" },
  { "start": 6.50, "end": 6.54, "value": "B" },
  { "start": 6.54, "end": 6.62, "value": "A" },
  { "start": 6.62, "end": 7.11, "value": "B" },
  { "start": 7.11, "end": 7.18, "value": "D" },
  { "start": 7.18, "end": 7.39, "value": "F" },
  { "start": 7.39, "end": 7.47, "value": "A" },
  { "start": 7.47, "end": 7.54, "value": "C" },
  { "start": 7.54, "end": 7.74, "value": "B" },
  { "start": 7.74, "end": 7.81, "value": "H" },
  { "start": 7.81, "end": 7.88, "value": "C" },
  { "start": 7.88, "end": 7.95, "value": "B" },
  { "start": 7.95, "end": 8.16, "value": "C" },
  { "start": 8.16, "end": 8.23, "value": "B" },
  { "start": 8.23, "end": 8.31, "value": "A" },
  { "start": 8.31, "end": 8.48, "value": "E" },
  { "start": 8.48, "end": 8.84, "value": "B" },
  { "start": 8.84, "end": 9.12, "value": "C" },
  { "start": 9.12, "end": 9.20, "value": "A" },
  { "start": 9.20, "end": 9.28, "value": "B" },
  { "start": 9.28, "end": 9.35, "value": "G" },
  { "start": 9.35, "end": 9.42, "value": "C" },
  { "start": 9.42, "end": 9.49, "value": "B" },
  { "start": 9.49, "end": 9.56, "value": "G" },
  { "start": 9.56, "end": 9.63, "value": "C" },
  { "start": 9.63, "end": 9.77, "value": "F" },
  { "start": 9.77, "end": 9.85, "value": "A" },
  { "start": 9.85, "end": 10.28, "value": "B" },
  { "start": 10.28, "end": 10.35, "value": "C" },
  { "start": 10.35, "end": 10.56, "value": "B" },
  { "start": 10.56, "end": 10.63, "value": "C" },
  { "start": 10.63, "end": 10.70, "value": "F" },
  { "start": 10.70, "end": 10.84, "value": "B" },
  { "start": 10.84, "end": 10.91, "value": "C" },
  { "start": 10.91, "end": 10.99, "value": "A" },
  { "start": 10.99, "end": 11.22, "value": "B" },
  { "start": 11.22, "end": 11.43, "value": "C" },
  { "start": 11.43, "end": 11.71, "value": "B" },
  { "start": 11.71, "end": 11.85, "value": "E" },
  { "start": 11.85, "end": 11.99, "value": "B" },
  { "start": 11.99, "end": 12.27, "value": "D" },
  { "start": 12.27, "end": 12.34, "value": "C" },
  { "start": 12.34, "end": 13.30, "value": "X" },
  { "start": 13.30, "end": 13.35, "value": "C" },
  { "start": 13.35, "end": 13.39, "value": "B" },
  { "start": 13.39, "end": 13.46, "value": "C" },
  { "start": 13.46, "end": 13.54, "value": "A" },
  { "start": 13.54, "end": 13.63, "value": "E" },
  { "start": 13.63, "end": 13.71, "value": "A" },
  { "start": 13.71, "end": 13.89, "value": "H" },
  { "start": 13.89, "end": 14.10, "value": "C" },
  { "start": 14.10, "end": 14.18, "value": "A" },
  { "start": 14.18, "end": 14.31, "value": "H" },
  { "start": 14.31, "end": 14.45, "value": "C" },
  { "start": 14.45, "end": 14.59, "value": "B" },
  { "start": 14.59, "end": 15.55, "value": "X" },
  { "start": 15.55, "end": 15.66, "value": "F" },
  { "start": 15.66, "end": 15.73, "value": "B" },
  { "start": 15.73, "end": 15.80, "value": "C" },
  { "start": 15.80, "end": 16.01, "value": "B" },
  { "start": 16.01, "end": 16.15, "value": "F" },
  { "start": 16.15, "end": 16.29, "value": "G" },
  { "start": 16.29, "end": 16.50, "value": "B" },
  { "start": 16.50, "end": 16.57, "value": "F" },
  { "start": 16.57, "end": 16.65, "value": "A" },
  { "start": 16.65, "end": 16.85, "value": "B" },
  { "start": 16.85, "end": 16.92, "value": "G" },
  { "start": 16.92, "end": 16.99, "value": "B" },
  { "start": 16.99, "end": 17.06, "value": "C" },
  { "start": 17.06, "end": 17.13, "value": "B" },
  { "start": 17.13, "end": 17.27, "value": "C" },
  { "start": 17.27, "end": 17.34, "value": "B" },
  { "start": 17.34, "end": 17.55, "value": "C" },
  { "start": 17.55, "end": 17.69, "value": "B" },
  { "start": 17.69, "end": 17.76, "value": "G" },
  { "start": 17.76, "end": 17.83, "value": "E" },
  { "start": 17.83, "end": 17.91, "value": "A" },
  { "start": 17.91, "end": 18.13, "value": "B" },
  { "start": 18.13, "end": 18.20, "value": "C" },
  { "start": 18.20, "end": 18.48, "value": "B" },
  { "start": 18.48, "end": 18.76, "value": "C" },
  { "start": 18.76, "end": 19.20, "value": "B" },
  { "start": 19.20, "end": 19.33, "value": "D" },
  { "start": 19.33, "end": 19.47, "value": "B" },
  { "start": 19.47, "end": 19.55, "value": "A" },
  { "start": 19.55, "end": 19.63, "value": "C" },
  { "start": 19.63, "end": 19.87, "value": "B" },
  { "start": 19.87, "end": 20.00, "value": "E" },
  { "start": 20.00, "end": 20.07, "value": "B" },
  { "start": 20.07, "end": 20.14, "value": "C" },
  { "start": 20.14, "end": 20.22, "value": "A" },
  { "start": 20.22, "end": 20.42, "value": "B" },
  { "start": 20.42, "end": 20.63, "value": "C" },
  { "start": 20.63, "end": 20.70, "value": "H" },
  { "start": 20.70, "end": 20.77, "value": "C" },
  { "start": 20.77, "end": 20.85, "value": "A" },
  { "start": 20.85, "end": 21.02, "value": "B" },
  { "start": 21.02, "end": 21.09, "value": "C" },
  { "start": 21.09, "end": 21.30, "value": "B" },
  { "start": 21.30, "end": 21.44, "value": "E" },
  { "start": 21.44, "end": 21.51, "value": "B" },
  { "start": 21.51, "end": 21.65, "value": "C" },
  { "start": 21.65, "end": 21.86, "value": "B" },
  { "start": 21.86, "end": 22.84, "value": "X" },
  { "start": 22.84, "end": 22.93, "value": "B" },
  { "start": 22.93, "end": 23.07, "value": "E" },
  { "start": 23.07, "end": 23.14, "value": "B" },
  { "start": 23.14, "end": 23.28, "value": "C" },
  { "start": 23.28, "end": 23.56, "value": "F" },
  { "start": 23.56, "end": 23.63, "value": "E" },
  { "start": 23.63, "end": 23.70, "value": "B" },
  { "start": 23.70, "end": 23.78, "value": "A" },
  { "start": 23.78, "end": 23.91, "value": "C" },
  { "start": 23.91, "end": 23.98, "value": "B" },
  { "start": 23.98, "end": 24.12, "value": "C" },
  { "start": 24.12, "end": 24.40, "value": "B" },
  { "start": 24.40, "end": 24.61, "value": "F" },
  { "start": 24.61, "end": 24.96, "value": "B" },
  { "start": 24.96, "end": 25.03, "value": "C" },
  { "start": 25.03, "end": 25.10, "value": "B" },
  { "start": 25.10, "end": 25.17, "value": "F" },
  { "start": 25.17, "end": 25.31, "value": "B" },
  { "start": 25.31, "end": 25.39, "value": "A" },
  { "start": 25.39, "end": 25.53, "value": "B" },
  { "start": 25.53, "end": 25.67, "value": "E" },
  { "start": 25.67, "end": 25.88, "value": "B" },
  { "start": 25.88, "end": 26.09, "value": "C" },
  { "start": 26.09, "end": 26.37, "value": "B" },
  { "start": 26.37, "end": 26.51, "value": "D" },
  { "start": 26.51, "end": 26.58, "value": "C" },
  { "start": 26.58, "end": 26.65, "value": "E" },
  { "start": 26.65, "end": 26.79, "value": "B" },
  { "start": 26.79, "end": 26.86, "value": "E" },
  { "start": 26.86, "end": 26.93, "value": "G" },
  { "start": 26.93, "end": 27.07, "value": "E" },
  { "start": 27.07, "end": 27.28, "value": "B" },
  { "start": 27.28, "end": 28.23, "value": "X" },
  { "start": 28.23, "end": 28.32, "value": "C" },
  { "start": 28.32, "end": 28.39, "value": "G" },
  { "start": 28.39, "end": 28.74, "value": "B" },
  { "start": 28.74, "end": 28.82, "value": "A" },
  { "start": 28.82, "end": 28.93, "value": "B" },
  { "start": 28.93, "end": 29.07, "value": "C" },
  { "start": 29.07, "end": 29.15, "value": "A" },
  { "start": 29.15, "end": 29.24, "value": "B" },
  { "start": 29.24, "end": 29.45, "value": "F" },
  { "start": 29.45, "end": 29.59, "value": "B" },
  { "start": 29.59, "end": 29.80, "value": "E" },
  { "start": 29.80, "end": 29.94, "value": "B" },
  { "start": 29.94, "end": 30.01, "value": "C" },
  { "start": 30.01, "end": 30.08, "value": "B" },
  { "start": 30.08, "end": 30.16, "value": "A" },
  { "start": 30.16, "end": 30.25, "value": "C" },
  { "start": 30.25, "end": 30.74, "value": "B" },
  { "start": 30.74, "end": 31.70, "value": "X" },
  { "start": 31.70, "end": 31.74, "value": "B" },
  { "start": 31.74, "end": 31.92, "value": "C" },
  { "start": 31.92, "end": 32.20, "value": "B" },
  { "start": 32.20, "end": 33.17, "value": "X" },
  { "start": 33.17, "end": 33.22, "value": "B" },
  { "start": 33.22, "end": 33.26, "value": "C" },
  { "start": 33.26, "end": 33.40, "value": "D" },
  { "start": 33.40, "end": 34.03, "value": "B" },
  { "start": 34.03, "end": 34.24, "value": "D" },
  { "start": 34.24, "end": 34.31, "value": "B" },
  { "start": 34.31, "end": 34.52, "value": "E" },
  { "start": 34.52, "end": 34.59, "value": "F" },
  { "start": 34.59, "end": 35.44, "value": "X" }  
]

const Avatar = ({readyToPlay}) => {
  // const audio = useMemo(() => new Audio(`/welcome.mp3`) , [phonemeSequence]);
  const audio = useMemo(() => new Audio(`/demo_audio.mp3`) , [phonemeSequence]);
  const gltf = useLoader(GLTFLoader, '/facecap.glb', (loader) => {
    const ktx2Loader = new KTX2Loader()
      .setTranscoderPath('/basis/')
      .detectSupport(new THREE.WebGLRenderer());
    loader.setKTX2Loader(ktx2Loader);
    loader.setMeshoptDecoder(MeshoptDecoder);
  });

  const avatarRef = useRef();
  const [morphDict, setMorphDict] = useState({});
  const [startTime, setStartTime] = useState(null);
  const [animation, setAnimation] = useState("Idle");


  useEffect(()=>{
    console.log({readyToPlay})

  })
  useEffect(() => {
    if (gltf && gltf.scene) {
      const mesh = gltf.scene.getObjectByName('mesh_2');
      if (mesh && mesh.morphTargetDictionary) {
        avatarRef.current = mesh;
        setMorphDict(mesh.morphTargetDictionary);
        setStartTime(performance.now() / 1000); // Start lipsync timing
      }
    }
  }, [gltf]);


  useEffect(() => {
    if (readyToPlay == true){
      audio.play();
      setAnimation("Greeting");  
    }
  }, [readyToPlay]);

  useFrame(() => {
    const currentAudioTime = audio.currentTime;
    if (audio.paused || audio.ended) {
      setAnimation("Idle");
      return;
    }

    const mesh = avatarRef.current;
    if (!mesh || !mesh.morphTargetInfluences || !startTime) return;

    const currentTime = (performance.now() / 1000) - startTime;
    mesh.morphTargetInfluences.fill(0);

    const current = phonemeSequence.find(
      (p) => currentAudioTime  >= p.start && currentAudioTime  <= p.end
    );

    if (current) {
      const viseme =  visemeToMouthMovement[ phonemeToViseme[current.value] ];
      const index = morphDict[viseme];
      if (index !== undefined) {
        mesh.morphTargetInfluences[index] = 0.9;
      }
    }
  });

  return <primitive object={gltf.scene} scale={1.5} />;  
};

const LipSyncApp = ({inputText , readyToPlay}) => (
  <Avatar readyToPlay = {readyToPlay}/>

);

export default LipSyncApp;


