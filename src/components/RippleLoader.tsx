import React from 'react';
import './RippleLoader.css';
import aiAvatar from '../assets/ai-avatar.png';

const RippleLoader: React.FC = () => {
  return (
    <div className="loader">
      <div className="box">
        <div className="logo">
          <img src={aiAvatar} alt="AI Avatar" className="avatar-img" />
        </div>
      </div>
      <div className="box"></div>
      <div className="box"></div>
      <div className="box"></div>
      <div className="box"></div>
    </div>
  );
};

export default RippleLoader;
