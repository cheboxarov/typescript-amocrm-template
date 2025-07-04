export interface IWidget {
	render: (self: any) => boolean;
	init: () => boolean;
	bind_actions: () => boolean;
	settings: () => boolean;
	onSave: () => boolean;
	destroy: () => boolean;
} 