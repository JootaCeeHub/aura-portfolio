import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ConfigPage from './config/ConfigPage'; // <-- nueva import

function App() {
	return (
		<Router>
			<Routes>
				{/* ...otras rutas... */}
				<Route path="/" element={<Navigate to="/config" replace />} />
				<Route path="/config" element={<ConfigPage />} />{/* <-- nueva ruta */}
			</Routes>
		</Router>
	);
}

export default App;