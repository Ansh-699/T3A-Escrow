# T3A Escrow – Conditional Token Swap (Devnet)

**Token A & B**: `Turbin3-Ansh (T3A)`  
**Mint**: [`44rwMB76AsTSYtW8NRdvLFFT3ffLgVcHRYaSjfG1TpZb`](https://explorer.solana.com/address/44rwMB76AsTSYtW8NRdvLFFT3ffLgVcHRYaSjfG1TpZb?cluster=devnet)  
**Network**: **Solana Devnet**  
**Program ID**: `7LxAAWCdkN23D7dCghPsxGKkKqx7GSWZnuCpJxEWJVe8`  
**Maker Wallet**: `J7ukxdgD3MVU4YFz8NYDZusAE7xHgAjbZBzqPs4RRazG`

---

## 1. Make Offer  
**Lock 100 T3A → Want 50 T3A**

**Transaction**:  
[View on Explorer](https://explorer.solana.com/tx/5kw4WXisx5S1McgBX3nx7BHvnxhXsiR4WRTFqaM5au3w6Lmudf6xqpdgmqvtUspXKokAELXkt2K25R5JxiCrFZfD?cluster=devnet)

![Make Offer Transaction](assets/make-offer.png)

> **Escrow PDA created. Vault ATA initialized. 100 T3A locked.**

---

## 2. Take Offer  
**Taker sends 50 T3A → Gets 100 T3A**

**Transaction**:  
[View on Explorer](https://explorer.solana.com/tx/4Zxcfw3N3j2dckeCwrvSctJkgKNKezeTiDxgufJrqHXCxSTYtEGhqMFnDv8EZtjrnQRQ2qy2bwBJmJ7uh4wHBcze?cluster=devnet) 

![Take Offer Transaction](assets/take-offer.png)

> **Condition met. Tokens swapped. Escrow closed.**

---

## 3. Refund Offer (Verified)

**Transaction**:  
[View on Explorer](https://explorer.solana.com/tx/4auGVRr25YriiSJ9AwuD59dy9P7StN5e9erf43eR8efxoptxwkB7rr3MxzJHnq5pxxHQWCPpyDWXVE7FMtzbt1CB?cluster=devnet)

![Refund Transaction](assets/refund-offer.png)

> **Maker refunded. Vault closed.**

