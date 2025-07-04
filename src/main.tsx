import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

interface IWidget {
	render: (self: any) => boolean;
	init: () => boolean;
	bind_actions: () => boolean;
	settings: () => boolean;
	onSave: () => boolean;
	destroy: () => boolean;
}

const Widget: IWidget = {
	render(self: any) {

    // тут замена существующего элемента
    // const FormPayment_div = document.querySelector('[data-id="1253779"]');
    // const div = document.createElement('div');
    // const parent = FormPayment_div.parentElement;
    // parent.replaceChild(div, FormPayment_div);

    // тут создание нового элемента
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