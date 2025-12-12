import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const Widget = {
	render(self?: any) {
		try {
			let container = document.getElementById('calls-manager-widget-root');

			if (!container) {
				container = document.createElement('div');
				container.id = 'calls-manager-widget-root';
				container.setAttribute('data-widget-version', '1.0.0');
				document.body.appendChild(container);
			}

			const root = ReactDOM.createRoot(container);
			root.render(React.createElement(App));

			return true;
		} catch (error) {
			console.error('Ошибка рендеринга виджета:', error);
			return false;
		}
	},

	init(self?: any) {
		return true;
	},

	bind_actions(self?: any) {
		return true;
	},

	settings(self?: any) {
		return {};
	},

	onSave(self?: any) {
		return true;
	},

	destroy(self?: any) {
		try {
			const container = document.getElementById('calls-manager-widget-root');
			if (container) {
				container.remove();
			}
			return true;
		} catch (error) {
			console.error('Ошибка при уничтожении виджета:', error);
			return false;
		}
	},
};

export default Widget;