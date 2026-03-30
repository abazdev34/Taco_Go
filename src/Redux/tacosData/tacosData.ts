/** @format */

import ChickenTaco from "../../assets/img/chicken.jpg"
import grick_taco from "../../assets/img/grick_taco.png"
import Taco from "../../assets/img/taco1.jpg"

import BeefRollUp from "../../assets/img/BeefRollUp.jpg"
import BurritoVega from "../../assets/img/BurritoVega.jpg"
import rollUpDoubleChease from "../../assets/img/rollUpDubleChese.jpg"

import BeefKesal from "../../assets/img/beefKesal.png"
import ChickenKesal from "../../assets/img/chickeKesal.png"
import ChickenKesalBBQ from "../../assets/img/chikenKesalBBQ.png"

import guacovole from "../../assets/img/guacavole.png"
import nachos from "../../assets/img/nachos.png"
import nachosChili from "../../assets/img/nachosChili.png"

import halopeno from "../../assets/img/halopeno.png"
import pico from "../../assets/img/pico.png"
import salsa from "../../assets/img/soas_salsa.png"

export const tacosData = [
	{
		id: "100",
		title: "Тако",
		tacoCategory: [
			{
				id: "1",
				img: Taco,
				title: "Хрустящее тако",
				measure: "250г",
				quantity: 0,
				price: 350,
				description: "Описание",
			},
			{
				id: "2",
				img: ChickenTaco,
				title: "Чикен тако",
				measure: "250г",
				quantity: 0,
				price: 522,
				description: "Описание",
			},
			{
				id: "3",
				img: grick_taco,
				title: "Грик тако",
				measure: "250г",
				quantity: 0,
				price: 200,
				description: "Описание",
			},
		],
	},
	{
		id: "200",
		title: "Буррито",
		tacoCategory: [
			{
				id: "4",
				img: rollUpDoubleChease,
				title: "Ролл-ап Дабл-чиз",
				measure: "250г",
				quantity: 0,
				price: 250,
				description: "Описание",
			},
			{
				id: "5",
				img: BurritoVega,
				title: "Буррито Вега",
				measure: "250г",
				quantity: 0,
				price: 250,
				description: "Описание",
			},
			{
				id: "6",
				img: BeefRollUp,
				title: "Биф ролл-ап",
				measure: "250г",
				quantity: 0,
				price: 250,
				description: "Описание",
			},
		],
	},
	{
		id: "300",
		title: "Кесадильи",
		tacoCategory: [
			{
				id: "7",
				img: ChickenKesalBBQ,
				title: "Чикен кесадилья BBQ",
				measure: "365г",
				quantity: 0,
				price: 689,
				description: "Описание",
			},
			{
				id: "8",
				img: ChickenKesal,
				title: "Чикен кесадилья",
				measure: "350г",
				quantity: 0,
				price: 650,
				description: "Описание",
			},
			{
				id: "9",
				img: BeefKesal,
				title: "Биф кесадилья",
				measure: "350г",
				quantity: 0,
				price: 650,
				description: "Описание",
			},
		],
	},
	{
		id: "400",
		title: "Начос",
		tacoCategory: [
			{
				id: "10",
				img: nachos,
				title: "Начос с сырным соусом",
				measure: "250г",
				quantity: 0,
				price: 250,
				description: "Описание",
			},
			{
				id: "11",
				img: guacovole,
				title: "Начос с гуакамоле",
				measure: "250г",
				quantity: 0,
				price: 250,
				description: "Описание",
			},
			{
				id: "12",
				img: nachosChili,
				title: "Начос с сальсой",
				measure: "250г",
				quantity: 0,
				price: 250,
				description: "Описание",
			},
		],
	},
	{
		id: "500",
		title: "Соусы",
		tacoCategory: [
			{
				id: "13",
				img: pico,
				title: "Пико де Гайо",
				measure: "250г",
				quantity: 0,
				price: 250,
				description: "Описание",
			},
			{
				id: "14",
				img: halopeno,
				title: "Халапеньо",
				measure: "250г",
				quantity: 0,
				price: 250,
				description: "Описание",
			},
			{
				id: "15",
				img: salsa,
				title: "Соус Сальса",
				measure: "250г",
				quantity: 0,
				price: 250,
				description: "Описание",
			},
		],
	},
]