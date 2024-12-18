import './homepage.css'
import { Link } from 'react-router-dom'

const Homepage = () => {
  return (
    <div className='homepage'>
      <img src="" alt="" />
        <div className="right">
          <h1>JARPIS</h1>
          <h2>Asisten Memasak Cerdas Anda</h2>
          <h3>Temukan resep, panduan langkah demi langkah, dan tips memasak untuk membuat hidangan sempurna setiap saat. JARPIS siap membantu Anda di dapur!</h3>
          <Link to="/dashboard">Get Started</Link>
        </div>
        
        <div className="left">
          <div className="imgContainer">
            <div className="bgContainer">
              <div className="bg"></div>
            </div>
            <img src="bot.png" alt="" className="bot"/>
          </div>

          <div className="terms">
            <img src="/logo.png" alt="" />
            <div className="links">
              <Link to="/">Terms of Service</Link>
              <span> | </span>
              <Link to="/">Privacy Policy</Link>
            </div>
          </div>
        </div>
    </div>
  )
}

export default Homepage