/** @format */
import { useState } from "react"
import { Toaster } from "react-hot-toast"
import { ImSpoonKnife } from "react-icons/im"
import { IoClose } from "react-icons/io5"
import { useDispatch, useSelector } from "react-redux"
import { actionTypeKeys } from "../../Redux/actionTypes/actionTypes"
import { IOrder, IState } from "../../Redux/actionTypes/types"
import "../Cart/cart.scss"

const Cart = () => {
	const showCart = useSelector((state: IState) => state.showCart)
	const cartTaco = useSelector((state: IState) => state.cart)
    
    // 1. Бардык заказдардын санын алабыз (Активдүү + Тарыхтагы)
    // Эгер Reducer-де 'history' жок болсо, 'orders.length' гана колдонуңуз
	const ordersCount = useSelector((state: IState) => 
        state.orders.length + ((state as any).history?.length || 0)
    )

	const [personCount, setPersonCount] = useState(1)
	const [isSuccess, setIsSuccess] = useState(false)
	
	const dispatch = useDispatch()

	const totalSum = cartTaco.reduce((acc, el) => acc + el.price * el.quantity, 0)

	const handleCartClose = () => {
		dispatch({ type: actionTypeKeys.TOGGLE_CART })
		setTimeout(() => setIsSuccess(false), 300)
	}

	const handleAcceptOrder = () => {
		if (cartTaco.length > 0) {
            // 2. Жаңы номер: Бардык заказдар + 1
            const nextOrderNumber = ordersCount + 1;

			const newOrder: IOrder = {
				id: String(nextOrderNumber), // Рандомдун ордуна катар номер
				items: [...cartTaco],
				totalSum: totalSum,
				personCount: personCount,
				status: 'pending',
				createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
			};

			dispatch({ type: actionTypeKeys.CREATE_ORDER, payload: newOrder });
			setIsSuccess(true);
			
			setTimeout(() => {
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
					<div style={{
						display: 'flex', flexDirection: 'column', alignItems: 'center', 
						justifyContent: 'center', height: '100%', textAlign: 'center'
					}}>
						<h1 style={{ color: '#4caf50', fontSize: '45px' }}>ПРИНЯТО! ✅</h1>
						<h2 style={{ marginTop: '20px', fontSize: '30px', color: '#333' }}>
							ЗАКАЗ №{ordersCount + 1} {/* Кардарга азыркы номерин көрсөтөбүз */}
						</h2>
						<p>Кийинки заказга даярданыңыз</p>
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
							<button onClick={handleAcceptOrder} className="cart__banner" style={{background: '#4caf50', border: 'none', cursor: 'pointer'}}>
								<p style={{fontSize: '22px', color: 'white'}}>ПРИНЯТЬ ЗАКАЗ</p>
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
