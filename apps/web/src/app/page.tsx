export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Logo/Brand */}
          <h1 className="text-6xl font-bold bg-linear-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
            DocsTalk
          </h1>
          
          {/* Tagline */}
          <p className="text-2xl text-gray-300">
            AI Documentation Assistant for Developers
          </p>
          
          {/* Value Proposition */}
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Stop reading thousands of pages. Get accurate answers from official documentation 
            with ready-to-use code examples. Powered by ENVOYOU.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex gap-4 justify-center pt-8">
            <button className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors">
              Try Free
            </button>
            <button className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors">
              View Pricing
            </button>
          </div>
          
          {/* Social Proof */}
          <p className="text-sm text-gray-500 pt-4">
            Join developers saving 10+ hours/week
          </p>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="py-8 text-center text-gray-500 text-sm">
        <p>&copy; 2025 DocsTalk. Built with ❤️ for developers.</p>
      </footer>
    </div>
  );
}
