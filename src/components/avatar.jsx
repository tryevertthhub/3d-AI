import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import LipSyncApp from './avatarmodel';

export default function AvatarScene() {
  const [inputText, setInputText] = useState();
  const [speakVlaue, setSpeakValue] = useState();
  const [readyToPlay, setReadyToPlay] = useState(false);



  const handleStart = () => {
    setReadyToPlay(true);
  };

  return (
    <>
    <div style={{ position: 'absolute',  width: '100vw', top: 20, left: 20 }}>
      <button style={{       width: '100%',
      backgroundColor: '#ff5722',
      color: '#ffffff',
      fontSize: '1rem',
      border: 'none',
      cursor: 'pointer' 
      }}  
      onClick={handleStart}>Speak</button>
    </div>

    <div style={{ marginTop: 0, padding: 0, width: '100vw', height: '70vh', overflow: 'hidden', backgroundColor: '#000000' }}>


      <Canvas
        camera={{ position: [0, 0.6, 3], fov: 80 }}
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 2, 5]} intensity={1} />
        <OrbitControls />
        <LipSyncApp inputText={speakVlaue} readyToPlay = {readyToPlay} />
      </Canvas>
    </div>

    </>
  );
}
