import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/app/App";
import { IWidget } from "@/types/widget";

const Widget: IWidget = {
	render(self: any) {
    const div = document.createElement('div');
    document.body.appendChild(div);
    div.setAttribute('class', 'amo_test_widget_12345');

		ReactDOM.createRoot(
			div,
		).render(
			<React.StrictMode>
				<App widget={self}/>
			</React.StrictMode>,
		);

		return true;
	},
	init(): boolean {

		return true;
	},
	bind_actions(): boolean {
		return true;
	},
	settings(): boolean {
		return true;
	},
	onSave(): boolean {
    return true;
  },
	destroy(): boolean {
    return true;
  },
};

export default Widget; 