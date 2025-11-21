"use client";

import React from 'react';

export function Loader() {
  return (
    <>
      <style jsx>{`
        @keyframes loading-keys-app-loading {
          0%,
          80%,
          100% {
            opacity: 0.75;
            box-shadow: 0 0 var(--color-primary);
            height: 32px;
          }
          40% {
            opacity: 1;
            box-shadow: 0 -8px var(--color-primary);
            height: 40px;
          }
        }

        .jimu-primary-loading:before,
        .jimu-primary-loading:after {
          position: absolute;
          top: 0;
          content: '';
        }

        .jimu-primary-loading:before {
          left: -19.992px;
        }

        .jimu-primary-loading:after {
          left: 19.992px;
          animation-delay: 0.32s !important;
        }

        .jimu-primary-loading:before,
        .jimu-primary-loading:after,
        .jimu-primary-loading {
          background: var(--color-primary);
          animation: loading-keys-app-loading 0.8s infinite ease-in-out;
          width: 13.6px;
          height: 32px;
        }

        .jimu-primary-loading {
          text-indent: -9999em;
          margin: auto;
          position: absolute;
          right: calc(50% - 6.8px);
          top: calc(50% - 16px);
          animation-delay: 0.16s !important;
        }
      `}</style>
      
      {/* Blurred Background */}
      <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50" />
      
      {/* Loader Container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="relative w-full h-full">
          <div className="jimu-primary-loading" />
        </div>
      </div>
    </>
  );
}

export default Loader;

