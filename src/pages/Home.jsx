import React from 'react';
import Hero from '../components/Hero';
import Header from '../components/Header';
import Stats from '../components/Stats';
import Features from '../components/Features';
import CTA from '../components/CTA';
import Footer from '../components/Footer';

const Home = () => {
  return (
    <>
      <Header />
      <Hero />
      <Stats />
      <Features />
      <CTA />
      <Footer />
    </>
  );
};

export default Home;