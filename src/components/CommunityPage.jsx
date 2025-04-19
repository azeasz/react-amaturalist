     // src/components/CommunityPage.jsx
     import React from 'react';

     const CommunityPage = () => {
      return (
        <div className="content min-h-screen bg-stone-50 p-8">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <h1 className="text-3xl font-serif text-stone-800">Komunitas</h1>
            
            <div className="relative p-8 bg-white rounded-lg shadow-sm border border-stone-100">
              <div className="space-y-4">
              <img 
                  src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/sprout.svg"
                  alt="Tanaman yang sedang tumbuh" 
                  className="w-32 h-32 mx-auto opacity-80"
                />                
                <h2 className="text-xl text-stone-700 font-medium">
                  Sedang Dalam Pengembangan
                </h2>
                
                <p className="text-stone-600 leading-relaxed">
                  Seperti benih yang sedang tumbuh, halaman komunitas kami masih dalam tahap pengembangan. 
                  Kami sedang menyiapkan ruang yang nyaman untuk berbagi dan berinteraksi.
                </p>
                
                <div className="flex items-center justify-center gap-2 text-stone-500 text-sm">
                  <span className="block w-2 h-2 bg-stone-300 rounded-full animate-pulse"></span>
                  <span className="block w-2 h-2 bg-stone-300 rounded-full animate-pulse delay-100"></span>
                  <span className="block w-2 h-2 bg-stone-300 rounded-full animate-pulse delay-200"></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    };
     export default CommunityPage;