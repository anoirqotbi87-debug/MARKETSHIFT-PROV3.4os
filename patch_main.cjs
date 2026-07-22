const fs = require('fs');
let code = fs.readFileSync('src/main.tsx', 'utf8');

const boundary = `
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("React Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div style={{padding: '20px', color: 'red', backgroundColor: '#fee'}}>
        <h1>Runtime Error</h1>
        <pre>{this.state.error && this.state.error.toString()}</pre>
        <pre>{this.state.error && this.state.error.stack}</pre>
      </div>;
    }
    return this.props.children; 
  }
}
`;

if (!code.includes('ErrorBoundary')) {
  code = code.replace(/import React from 'react';/, "import React from 'react';\n" + boundary);
  code = code.replace(/<App \/>/, "<ErrorBoundary><App /></ErrorBoundary>");
  fs.writeFileSync('src/main.tsx', code);
}
