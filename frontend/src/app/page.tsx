export default function WelcomePage() {
  return (
    <div className="container mx-auto p-8 text-center">
      <h1 className="text-4xl font-bold mb-4">Welcome to Stock Insight!</h1>
      <p className="mb-6 text-lg">
        Explore company data, visualize stock prices, and more.<br />
        <a href="/companies" className="text-blue-600 underline">Browse all companies</a> or explore individual stocks.
      </p>
    </div>
  );
}