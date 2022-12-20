import Head from 'next/head'
import styles from '../styles/Home.module.css'
import { Contract, providers, Signer } from "ethers";
import { formatEther } from "ethers/lib/utils";
import React, { useEffect, useState, useRef } from 'react';
import Web3Modal from "web3modal";
import {
  CRYPTODEVS_DAO_ABI,
  CRYPTODEVS_DAO_CONTRACT_ADDRESS,
  CRYPTODEVS_NFT_ABI,
  CRYPTODEVS_NFT_CONTRACT_ADDRESS,
} from "../constants";


const Home: React.FC = () => {


  // ETH Balance of the DAO contract  
  const [treasuryBalance, setTreasuryBalance] = useState<string>('0');

  // Number of proposals created in the DAO
  const [numProposals, setNumProposals] = useState<number>(0);

  // Array of all proposals created in the DAO
  const [proposals, setProposals] = useState<(ParsedProposal | undefined)[]>([]);


  // User's balance of CryptoDevs NFTs
  const [nftBalance, setNftBalance] = useState<number>(0);

  // Fake NFT Token ID to purchase. Used when creating a proposal.
  const [fakeNftTokenId, setFakeNftTokenId] = useState<number>();

  // One of "Create Proposal" or "View Proposals"
  const [selectedTab, setSelectedTab] = useState<string>("");

  // True if waiting for a transaction to be mined, false otherwise.
  const [loading, setLoading] = useState<boolean>(false);

  // True if user has connected their wallet, false otherwise
  const [walletConnected, setWalletConnected] = useState<boolean>(false);

  // isOwner gets the owner of the contract through the signed address
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const web3ModalRef = useRef<any>();



  const connectWallet = async () => {
    try {
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (error) {
      console.log(error);

    }
  }
  // getOwner: gets the contract owner by connected address
  const getDAOOwner = async () => {
    try {

      const signer = await getProviderOrSigner(true);
      const contract = getDaoContractInstance(signer);

      const _owner: string = await contract.owner();
      const address: string = await signer.getAddress();
      console.log(address, 'addrs')
      if (address.toLowerCase() === _owner.toLowerCase()) {
        setIsOwner(true);
      }


    } catch (error) {
      console.log(error);
    }
  }
  // * withdrawCoins: withdraws ether by calling
  //  the withdraw function in the contract
  const withdrawDAOEther = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      const contract = getDaoContractInstance(signer);

      const tx = await contract.withdrawEther();
      setLoading(true);
      await tx.wait();
      setLoading(false);
      getDAOTreasuryBalance();
    } catch (error: any) {
      console.log(error);
      window.alert(error.reason);
    }
  };
  // Reads the ETH balance of the DAO contract and sets the `treasuryBalance` state variable

  const getDAOTreasuryBalance = async () => {
    try {
      const provider = await getProviderOrSigner();
      const balance = await provider.getBalance(
        CRYPTODEVS_DAO_CONTRACT_ADDRESS
      );
      setTreasuryBalance(balance.toString());
    } catch (error) {
      console.log(error)
    }
  }

  // Reads the number of proposals in the DAO contract and sets the `numProposals` state variable

  const getNumProposalsInDAO = async () => {
    try {
      const provider = await getProviderOrSigner();
      const contract = getDaoContractInstance(provider);
      const daoNumProposals: number = await contract.numProposals();
      setNumProposals(daoNumProposals);
    } catch (error) {
      console.log(error);
    }
  };

  // Reads the balance of the user's CryptoDevs NFTs and sets the `nftBalance` state variable

  const getUserNFTBalance = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      const nftContract = getCryptodevsNFTContractInstance(signer);
      const balance = await nftContract.balanceOf(signer.getAddress())
      console.log(balance, 'balance')
      setNftBalance(parseInt(balance.toString()));
    } catch (error) {
      console.log(error);
    }
  }
  // Calls the `createProposal` function in the contract, using the tokenId from `fakeNftTokenId`

  const createProposal = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      const daoContract = getDaoContractInstance(signer);
      const tx = await daoContract.createProposal(fakeNftTokenId)
      setLoading(true);
      await tx.wait();
      await getNumProposalsInDAO();
      setLoading(false);
    } catch (error) {
      console.log(error);
    }
  };

  type ParsedProposal = {
    proposalId: number,
    nftTokenId: string,
    deadline: Date,
    yayVotes: string,
    nayVotes: string,
    executed: boolean
  }

  // Helper function to fetch and parse one proposal from the DAO contract
  // Given the Proposal ID
  // and converts the returned data into a Javascript object with values we can use

  const fetchProposalById = async (id: number) => {
    try {
      const provider = await getProviderOrSigner();
      const daoContract = getDaoContractInstance(provider);
      const proposal = await daoContract.proposals(id);
      // console.log('proposal--->', proposal);


      const parsedProposal: ParsedProposal = {
        proposalId: id,
        nftTokenId: proposal.nftTokenId.toString(),
        deadline: new Date(parseInt(proposal.deadline.toString()) * 1000),
        yayVotes: proposal.yayVotes.toString(),
        nayVotes: proposal.nayVotes.toString(),
        executed: proposal.executed,
      };
      // console.log('id :',id);


      return parsedProposal;

    } catch (error) {
      console.log(error);
    };
  }

  // Runs a loop `numProposals` times to fetch all proposals in the DAO
  // and sets the `proposals` state variable
  const fetchAllProposals = async () => {
    try {
      const proposals: (ParsedProposal | undefined)[] = []

      for (let i = 0; i < numProposals; i++) {
        const proposal = await fetchProposalById(i);
        proposals.push(proposal);
      }
      setProposals(proposals);
      return proposals;
    } catch (error) {
      console.log(error);
    }
  }

  // Calls the `voteOnProposal` function in the contract, using the passed
  // proposal ID and Vote
  const voteOnProposal = async (proposalId: number, _vote: number | string) => {
    try {
      const signer = await getProviderOrSigner(true);
      const daoContract = getDaoContractInstance(signer);

      let vote = _vote === "YAY" ? 0 : 1;
      const tx = await daoContract.voteOnProposal(proposalId, vote);
      setLoading(true);
      await tx.wait();
      setLoading(false);
      await fetchAllProposals();

    } catch (error) {
      console.log(error);
    }
  }

  // Calls the `executeProposal` function in the contract, using
  // the passed proposal ID
  const executeProposal = async (proposalId: number) => {
    try {
      const signer = await getProviderOrSigner(true);
      const daoContract = getDaoContractInstance(signer);
      const txn = await daoContract.executeProposal(proposalId);
      setLoading(true);
      await txn.wait();
      setLoading(false);
      await fetchAllProposals();
      getDAOTreasuryBalance();
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    if (!walletConnected) {
      web3ModalRef.current = new Web3Modal({
        network: "goerli",
        providerOptions: {},
        disableInjectedProvider: false,
      });
      connectWallet().then(() => {
        getDAOTreasuryBalance();
        getUserNFTBalance();
        getNumProposalsInDAO();
        getDAOOwner();
      })
    }
  }, [walletConnected]);

  useEffect(() => {
    if (selectedTab === "View Proposals") {
      fetchAllProposals();
    }
  }, [selectedTab])


  function renderTabs() {
    if (selectedTab === "Create Proposal") {
      return renderCreateProposalTab();
    } else if (selectedTab === "View Proposals") {
      return renderViewProposalsTab();
    }
    return null;
  }


  // Renders the 'Create Proposal' tab content

  function renderCreateProposalTab() {
    if (loading) {
      return (
        <div className={styles.description}>
          Loading... Waiting for transaction...
        </div>
      );
    } else if (nftBalance === 0) {
      return (
        <div className={styles.description}>
          You do not own any CryptoDevs NFTs. <br />
          <b>You cannot create or vote on proposals</b>
        </div>
      );
    } else {
      return (
        <div className={styles.container}>
          <label>Fake NFT Token ID to Purchase:</label>
          <input
            placeholder='0'
            type='number'
            onChange={(e) => setFakeNftTokenId(Number(e.target.value))}
          >
          </input>
          <button className={styles.button2} onClick={createProposal}>
            Create Proposal
          </button>
        </div>
      );
    }
  }

  // Renders the 'View Proposals' tab content

  function renderViewProposalsTab() {
    if (loading) {
      return (
        <div className={styles.description}>
          Loading... Waiting for transaction...
        </div>
      );
    } else if (proposals.length === 0) {
      return (
        <div className={styles.description}>No proposals have been created</div>
      );
    } else {
      return (
        <>
          <div>
            {proposals && proposals.map((p: any, index) => (
              <div key={index} className={styles.proposalCard}>
                <p>Proposal ID : {p?.proposalId}</p>
                <p>Fake nft to Purchase : {p?.nftTokenId}</p>
                <p>Deadline: {p?.deadline.toLocaleString()}</p>
                <p>Yay Votes: {p?.yayVotes}</p>
                {console.log(p?.executed, p?.yayVotes, p?.nayVotes, p?.deadline.getTime(), Date.now())}
                <p>Nay Votes: {p?.nayVotes}</p>
                <p>Executed ? : {p?.executed} </p>

                {p.deadline.getTime() > Date.now() && !p?.executed ? (
 
                  <div className={styles.flex}>
                    <button
                      className={styles.button2}
                      onClick={() => voteOnProposal(p.proposalId, "YAY")}
                    >
                      Vote YAY
                    </button>
                    <button
                      className={styles.button2}
                      onClick={() => voteOnProposal(p.proposalId, "NAY")}
                    >
                      Vote NAY
                    </button>
                  </div>
                ) : p?.deadline.getTime() < Date.now() && !p?.executed ? (
                  <div className={styles.flex}>
                    <button
                      className={styles.button2}
                      onClick={() => executeProposal(p.proposalId)}
                    >
                      Execute Proposal{" "}
                      {Number(p.yayVotes) > Number(p.nayVotes) ? "(YAY)" : "(NAY)"}
                    </button>
                  </div>
                ) : (
                  <div className={styles.description}>Proposal Executed</div>
                )}
              </div>
            ))}
          </div>
        </>
      );
    }
  }
  // Helper function to return a CryptoDevs NFT Contract instance
  // given a Provider/Signer
  const getCryptodevsNFTContractInstance = (providerOrSigner: any) => {
    return new Contract(
      CRYPTODEVS_NFT_CONTRACT_ADDRESS,
      CRYPTODEVS_NFT_ABI,
      providerOrSigner
    )
  }

  // Helper function to return a DAO Contract instance
  // given a Provider/Signer
  const getDaoContractInstance = (providerOrSigner: any) => {
    return new Contract(
      CRYPTODEVS_DAO_CONTRACT_ADDRESS,
      CRYPTODEVS_DAO_ABI,
      providerOrSigner
    );
  };

  // Helper function to fetch a Provider/Signer instance from Metamask

  const getProviderOrSigner = async (needSigner: boolean = false) => {
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    const { chainId } = await web3Provider.getNetwork();
    if (chainId !== 5) {
      window.alert("Please switch to the Goerli network!");
      throw new Error("Please switch to the Goerli network");
    }

    if (needSigner) {
      const signer: providers.JsonRpcSigner = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  }





  return (
    <div>
      <Head>
        <title>CryptoDevs DAO</title>
        <meta name='description' content='CryptoDevs DAO' ></meta>
        <link rel='icon' href='/favicon.ico' />
      </Head>

      <div className={styles.main} >
        <div>
          <h1 className={styles.title}>Welcome to CryptoDevs</h1>
          <div className={styles.description}>Welcome to the DAO!</div>
          <div className={styles.description}>Your cryptodevs NFT balance: {nftBalance}
            <br />
            Treasury balance: {formatEther(treasuryBalance)} ETH
            <br />
            Total Number of proposals: {numProposals.toString()}
            <div className={styles.flex}>
              <button className={styles.button} onClick={() => setSelectedTab("Create Proposal")}
              >
                Create Proposal
              </button>
              <button
                className={styles.button}
                onClick={() => setSelectedTab("View Proposals")}
              >
                View Proposals
              </button>
            </div>

            {renderTabs()}

            {isOwner ? (
              <div>
                {loading ? <button className={styles.button}>Loading...</button>
                  : <button className={styles.button} onClick={withdrawDAOEther}>
                    Withdraw DAO ETH
                  </button>
                }
              </div>
            ) : ""}

          </div>
          <div>
            <img className={styles.image} src="/cryptodevs/0.svg" />
          </div>
        </div>

      </div>
      <footer className={styles.footer}>
        Made with &#10084; by DISHA
      </footer>
    </div>
  )
}

export default Home;