import React, { memo } from 'react';
import { Link } from 'react-router-dom';

const Home: React.FC = memo(() => {
  return (
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content text-center">
        <div className="max-w-md">
          <h1 className="text-5xl font-bold">Cobo Chat</h1>
          <p className="py-6">Welcome to Cobo Chat! A modern chat application built with React and DaisyUI.</p>
          <Link to="/chat" className="btn btn-primary">
            Get Started
          </Link>
        </div>
      </div>
    </div>
  );
});

export default Home;
