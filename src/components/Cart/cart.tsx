/** @format */
import { useEffect, useState } from "react"
import { Toaster, toast } from "react-hot-toast"
import { ImSpoonKnife } from "react-icons/im"
import { IoClose } from "react-icons/io5"
import { useDispatch, useSelector } from "react-redux"
import { actionTypeKeys } from "../../Redux/actionTypes/actionTypes"
import { IOrder, IState, ITaco } from "../../Redux/actionTypes/types"
import "../Cart/cart.scss"

const Cart = () => {
	const showCart = useSelector((state: IState) => state.showCart)
	const cartTaco = useSelector((state: IState) => state.cart)
	const [personCount, setPersonCount] = useState(1)
	// Заказ ийгиликтүү болгонун билүү үчүн статус
	const [isSuccess, setIsSuccess] = useState(false)
	
	const dispatch = useDispatch()

	const subtotal = cartTaco.reduce((acc, el) => acc + el.price * el.quantity, 0)
	const totalSum = subtotal // Доставка жана скидканы алып салсак болот (тез заказ үчүн)

	const handleCartClose = () => {
		dispatch({ type: actionTypeKeys.TOGGLE_CART })
		setIsSuccess(false) // Жапканда статусту баштапкыга келтиребиз
	}

	const handleAcceptOrder = () => {
		if (cartTaco.length > 0) {
			const newOrder: IOrder = {
				id: `№${Math.floor(1000 + Math.random() * 9000)}`, // Заказ ID
				items: [...cartTaco],
				totalSum: totalSum,
				personCount: personCount,
				status: 'pending',
				createdAt: new Date().toLocaleTimeString(),
			};

			// 1. Ашканага жөнөтүү
			dispatch({ type: actionTypeKeys.CREATE_ORDER, payload: newOrder });
			
			// 2. Билдирүү чыгаруу
			setIsSuccess(true);
			
			// 3. 2 секунддан кийин корзинаны тазалап, жабуу
			setTimeout(() => {
				dispatch({ type: actionTypeKeys.CLEAR_CART });
				setIsSuccess(false);
				handleCartClose();
				setPersonCount(1);
			}, 2500);
		}
	}

	return (
		<div className="cart__node" style={{ display: showCart ? "flex" : "none" }}>
			<div className="left__div" onClick={handleCartClose} />
			<div className="right__div">
				
				{isSuccess ? (
					// ЗАКАЗ КЕТКЕНДЕН КИЙИНКИ ЭКРАН
					<div style={{
						display: 'flex', flexDirection: 'column', alignItems: 'center', 
						justifyContent: 'center', height: '100%', textAlign: 'center'
					}}>
						<h1 style={{ color: '#4caf50', fontSize: '45px' }}>ПРИНЯТО! ✅</h1>
						<h2 style={{ marginTop: '20px', fontSize: '30px', color: '#333' }}>
							СЛЕДУЮЩИЙ ЗАКАЗ
						</h2>
					</div>
				) : (
					<>
						<h1 className="cart__title">Текущий заказ</h1>
						<button className="cart__close" onClick={handleCartClose}>
							<IoClose />
						</button>
						<div className="cart">
							{cartTaco.length > 0 ? (
								cartTaco.map(item => (
									<div key={item.id} className="cart__container">
										<div className="cart__img">
											<img src={item.img} alt={item.title} />
											<h1>{item.title}</h1>
										</div>
										<div className="cart__count">
											<p>{item.price * item.quantity} сом</p>
											<div className="cart__btns">
												<button className="cart__btn" onClick={() => dispatch({ type: actionTypeKeys.REMOVE_FROM_CART, payload: item })}>-</button>
												<p>{item.quantity}</p>
												<button className="cart__btn" onClick={() => dispatch({ type: actionTypeKeys.ADD_TO_CART, payload: item })}>+</button>
											</div>
										</div>
									</div>
								))
							) : (
								<p style={{textAlign: 'center', marginTop: '40px'}}>Корзина бош</p>
							)}
						</div>

						<div className="cart__summary">
							<div className="count">
								<div className="cart__img">
									<span><ImSpoonKnife /></span>
									<p>количество персон</p>
								</div>
								<div className="cart__btns">
									<button className="cart__btn" onClick={() => setPersonCount(personCount > 1 ? personCount - 1 : 1)}>-</button>
									<h1>{personCount}</h1>
									<button className="cart__btn" onClick={() => setPersonCount(personCount + 1)}>+</button>
								</div>
							</div>
							<hr />
							<div className="cart_cost">
								<div className="discount">
									<span style={{fontWeight: 'bold', fontSize: '20px'}}>Итого:</span>
									<span style={{fontWeight: 'bold', fontSize: '20px'}}>{totalSum} сом</span>
								</div>
							</div>
						</div>

						{cartTaco.length > 0 && (
							<button onClick={handleAcceptOrder} className="cart__banner" style={{background: '#4caf50'}}>
								<p style={{fontSize: '22px'}}>ПРИНЯТЬ ЗАКАЗ</p>
							</button>
						)}
					</>
				)}
			</div>
			<Toaster position="top-center" />
		</div>
	)
}

export default Cart
