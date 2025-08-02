export default function WelcomePage() {
  return (
    <div className="container mx-auto p-8 text-center">
      <h1 className="text-4xl font-bold mb-4">Welcome to Stock Insight!</h1>
      <p className="mb-6 text-lg">
        Explore company data, visualize stock prices, and more.<br />
        Please <a href="/auth/login" className="text-blue-600 underline">login</a> or <a href="/auth/register" className="text-blue-600 underline">register</a> to get started.
      </p>
    </div>
  );
}